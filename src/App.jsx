import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  allocateSeat as apiAllocateSeat,
  askAssistant,
  createEmployee,
  loadAppData,
  releaseSeat as apiReleaseSeat,
} from './api'
import './App.css'

const zones = ['A', 'B', 'C', 'D', 'E', 'F']
const statuses = ['Available', 'Occupied', 'Reserved', 'Maintenance']

function App() {
  const [employees, setEmployees] = useState([])
  const [projects, setProjects] = useState([])
  const [seats, setSeats] = useState([])
  const [summary, setSummary] = useState(null)
  const [projectUtilization, setProjectUtilization] = useState([])
  const [floorUtilization, setFloorUtilization] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    project: 'All',
    floor: 'All',
    zone: 'All',
    status: 'All',
  })
  const [assistantQuery, setAssistantQuery] = useState('Where is employee Amit seated?')
  const [assistantAnswer, setAssistantAnswer] = useState('')
  const [newEmployee, setNewEmployee] = useState({
    name: 'New Joiner',
    email: 'new.joiner@ethara.ai',
    department: 'Engineering',
    role: 'Developer',
    projectId: 1,
  })
  const [notice, setNotice] = useState('Loading data from backend…')

  const refreshData = useCallback(async () => {
    const data = await loadAppData()
    setEmployees(data.employees)
    setProjects(data.projects)
    setSeats(data.seats)
    setSummary(data.summary)
    setProjectUtilization(data.projectUtilization)
    setFloorUtilization(data.floorUtilization)
    return data
  }, [])

  useEffect(() => {
    refreshData()
      .then(() => setNotice('Connected to backend. Changes are saved to backend/data.json.'))
      .catch(() => setNotice('Backend unavailable. Start it with: npm run backend'))
      .finally(() => setLoading(false))
  }, [refreshData])

  const joinedRows = useMemo(() => employees, [employees])

  const filteredRows = joinedRows.filter((row) => {
    const projectName = row.project?.name || ''
    const text = `${row.name} ${row.employeeCode} ${row.email} ${projectName}`.toLowerCase()
    return (
      text.includes(filters.search.toLowerCase()) &&
      (filters.project === 'All' || projectName === filters.project) &&
      (filters.floor === 'All' || row.seat?.floor === Number(filters.floor)) &&
      (filters.zone === 'All' || row.seat?.zone === filters.zone) &&
      (filters.status === 'All' || row.seat?.status === filters.status || row.status === filters.status)
    )
  })

  const projectBars = projects.map((project) => {
    const util = projectUtilization.find((item) => item.project_id === project.id)
    return { ...project, occupied: util?.occupied_seats || 0 }
  })

  async function handleAllocate(employeeId) {
    try {
      const result = await apiAllocateSeat(employeeId)
      await refreshData()
      setNotice(result.message)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function handleRelease(employeeId) {
    try {
      const result = await apiReleaseSeat(employeeId)
      await refreshData()
      setNotice(result.message)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function addEmployee(event) {
    event.preventDefault()
    try {
      const employee = await createEmployee(newEmployee)
      await refreshData()
      setNotice(`${employee.name} added as a new joiner. Use Allocate to assign a suggested seat.`)
      setNewEmployee({
        name: 'New Joiner',
        email: `joiner.${Date.now()}@ethara.ai`,
        department: 'Engineering',
        role: 'Developer',
        projectId: 1,
      })
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function answerQuestion(event) {
    event.preventDefault()
    try {
      const answer = await askAssistant(assistantQuery)
      setAssistantAnswer(answer)
    } catch (error) {
      setAssistantAnswer(`Error: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <main>
        <p className="notice">Loading Ethara seat allocation data…</p>
      </main>
    )
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Ethara workplace operations</p>
          <h1>Seat Allocation & Project Mapping</h1>
        </div>
        <div className="api-pill">API Connected</div>
      </header>

      <section className="stats">
        {summary &&
          [
            ['Total Employees', summary.employees],
            ['Total Seats', summary.seats],
            ['Occupied', summary.occupied],
            ['Available', summary.available],
            ['Reserved', summary.reserved],
            ['Pending Joiners', summary.pending],
          ].map(([label, value]) => (
            <article className="stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
      </section>

      <p className="notice">{notice}</p>

      <section className="grid two">
        <div className="panel">
          <h2>AI Assistant</h2>
          <form className="assistant" onSubmit={answerQuestion}>
            <input value={assistantQuery} onChange={(event) => setAssistantQuery(event.target.value)} />
            <button type="submit">Ask</button>
          </form>
          <p className="answer">{assistantAnswer || 'Try: Where is my seat? My email is amit@ethara.ai'}</p>
          <div className="quick-questions">
            {[
              'Show all available seats on Floor 3',
              'Who is sitting near me?',
              'How many seats are occupied for Project Indigo?',
              'Allocate a seat for a new employee joining today',
            ].map((question) => (
              <button key={question} type="button" onClick={() => setAssistantQuery(question)}>
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>New Joiner</h2>
          <form className="form" onSubmit={addEmployee}>
            <input value={newEmployee.name} onChange={(event) => setNewEmployee({ ...newEmployee, name: event.target.value })} />
            <input value={newEmployee.email} onChange={(event) => setNewEmployee({ ...newEmployee, email: event.target.value })} />
            <select value={newEmployee.projectId} onChange={(event) => setNewEmployee({ ...newEmployee, projectId: event.target.value })}>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button type="submit">Add Employee</button>
          </form>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Search & Allocation</h2>
          <span>{filteredRows.length} records</span>
        </div>
        <div className="filters">
          <input placeholder="Name, ID, email, project" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          <select value={filters.project} onChange={(event) => setFilters({ ...filters, project: event.target.value })}>
            <option>All</option>
            {projects.map((project) => (
              <option key={project.id}>{project.name}</option>
            ))}
          </select>
          <select value={filters.floor} onChange={(event) => setFilters({ ...filters, floor: event.target.value })}>
            <option>All</option>
            {[1, 2, 3, 4, 5].map((floor) => (
              <option key={floor}>{floor}</option>
            ))}
          </select>
          <select value={filters.zone} onChange={(event) => setFilters({ ...filters, zone: event.target.value })}>
            <option>All</option>
            {zones.map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option>All</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
            <option>Pending Allocation</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Project</th>
                <th>Seat</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.slice(0, 18).map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    <span>{row.employeeCode} | {row.email}</span>
                  </td>
                  <td>{row.project?.name}</td>
                  <td>{row.seat ? `F${row.seat.floor} Z${row.seat.zone} Bay ${row.seat.bay} Seat ${row.seat.seatNumber}` : 'Not allocated'}</td>
                  <td><mark>{row.seat?.status || row.status}</mark></td>
                  <td>
                    {row.seatAllocated ? (
                      <button type="button" onClick={() => handleRelease(row.id)}>Release</button>
                    ) : (
                      <button type="button" onClick={() => handleAllocate(row.id)}>Allocate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid two">
        <div className="panel">
          <h2>Project Utilization</h2>
          <div className="bars">
            {projectBars.map((project) => (
              <div className="bar-row" key={project.id}>
                <span>{project.name}</span>
                <div><i style={{ width: `${Math.min(project.occupied, 120)}px` }} /></div>
                <b>{project.occupied}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Floor Occupancy</h2>
          <div className="bars">
            {floorUtilization.map((floor) => (
              <div className="bar-row" key={floor.floor}>
                <span>Floor {floor.floor}</span>
                <div><i style={{ width: `${Math.min(floor.occupied / 2, 160)}px` }} /></div>
                <b>{floor.occupied} occ / {floor.available} free</b>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
