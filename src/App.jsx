import { useMemo, useState } from 'react'
import './App.css'

const projects = [
  { id: 1, name: 'Indigo', manager: 'Rhea Kapoor', zone: 'A' },
  { id: 2, name: 'Indreed', manager: 'Omar Khan', zone: 'B' },
  { id: 3, name: 'Mydreed', manager: 'Maya Iyer', zone: 'C' },
  { id: 4, name: 'Preed', manager: 'Dev Menon', zone: 'D' },
  { id: 5, name: 'Serfy', manager: 'Ava Thomas', zone: 'E' },
  { id: 6, name: 'Oreed', manager: 'Neil Shah', zone: 'F' },
  { id: 7, name: 'bedegreed', manager: 'Ira Das', zone: 'A' },
  { id: 8, name: 'Opreed', manager: 'Zain Ali', zone: 'B' },
  { id: 9, name: 'Serry', manager: 'Kiran Rao', zone: 'C' },
  { id: 10, name: 'Kaary', manager: 'Sara Nair', zone: 'D' },
  { id: 11, name: 'Mered', manager: 'Vik Mehta', zone: 'E' },
]

const firstNames = [
  'Amit',
  'Anaya',
  'Rahul',
  'Priya',
  'Kabir',
  'Nisha',
  'Arjun',
  'Meera',
  'Vihaan',
  'Tara',
  'Ishaan',
  'Riya',
]

const departments = ['Engineering', 'HR', 'Admin', 'Growth', 'Finance', 'Design']
const roles = ['Developer', 'Analyst', 'Manager', 'Coordinator', 'Designer', 'QA']
const zones = ['A', 'B', 'C', 'D', 'E', 'F']
const statuses = ['Available', 'Occupied', 'Reserved', 'Maintenance']

function makeSeats() {
  const list = []
  for (let floor = 1; floor <= 5; floor += 1) {
    for (const zone of zones) {
      for (let bay = 1; bay <= 10; bay += 1) {
        for (let number = 1; number <= 90; number += 1) {
          if (list.length === 2500) return list
          const index = list.length
          let status = 'Available'
          if (index < 980) status = 'Occupied'
          else if (index < 1480) status = 'Reserved'
          else if (index < 1630) status = 'Maintenance'
          list.push({
            id: index + 1,
            floor,
            zone,
            bay,
            seatNumber: `${zone}${bay}-${String(number).padStart(2, '0')}`,
            status,
            employeeId: index < 980 ? index + 1 : null,
            projectId: index < 980 ? (index % projects.length) + 1 : null,
            allocationDate: index < 980 ? '2026-07-01' : null,
          })
        }
      }
    }
  }
  return list
}

function makeEmployees() {
  return Array.from({ length: 1000 }, (_, index) => {
    const id = index + 1
    const projectId = (index % projects.length) + 1
    const first = firstNames[index % firstNames.length]
    const name = index === 0 ? 'Amit Sharma' : `${first} ${['Sharma', 'Nair', 'Khan', 'Rao', 'Das'][index % 5]}`
    return {
      id,
      employeeCode: `ETH${String(id).padStart(5, '0')}`,
      name,
      email: index === 0 ? 'amit@ethara.ai' : `${first.toLowerCase()}.${id}@ethara.ai`,
      department: departments[index % departments.length],
      role: roles[index % roles.length],
      joiningDate: `2026-0${(index % 6) + 1}-${String((index % 27) + 1).padStart(2, '0')}`,
      status: id > 980 ? 'Pending Allocation' : 'Active',
      projectId,
      seatAllocated: id <= 980,
    }
  })
}

function getProject(projectId) {
  return projects.find((project) => project.id === Number(projectId))
}

function App() {
  const [employees, setEmployees] = useState(makeEmployees)
  const [seats, setSeats] = useState(makeSeats)
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
  const [notice, setNotice] = useState('Seeded with 1,000 employees and 2,500 seats.')

  const joinedRows = useMemo(
    () =>
      employees.map((employee) => {
        const seat = seats.find((item) => item.employeeId === employee.id)
        const project = getProject(employee.projectId)
        return { ...employee, seat, project }
      }),
    [employees, seats],
  )

  const summary = useMemo(() => {
    const count = (status) => seats.filter((seat) => seat.status === status).length
    return {
      employees: employees.length,
      seats: seats.length,
      occupied: count('Occupied'),
      available: count('Available'),
      reserved: count('Reserved'),
      pending: employees.filter((employee) => !employee.seatAllocated).length,
    }
  }, [employees, seats])

  const filteredRows = joinedRows.filter((row) => {
    const text = `${row.name} ${row.employeeCode} ${row.email} ${row.project.name}`.toLowerCase()
    return (
      text.includes(filters.search.toLowerCase()) &&
      (filters.project === 'All' || row.project.name === filters.project) &&
      (filters.floor === 'All' || row.seat?.floor === Number(filters.floor)) &&
      (filters.zone === 'All' || row.seat?.zone === filters.zone) &&
      (filters.status === 'All' || row.seat?.status === filters.status || row.status === filters.status)
    )
  })

  const projectUtilization = projects.map((project) => ({
    ...project,
    occupied: seats.filter((seat) => seat.projectId === project.id && seat.status === 'Occupied').length,
  }))

  const floorUtilization = [1, 2, 3, 4, 5].map((floor) => {
    const floorSeats = seats.filter((seat) => seat.floor === floor)
    return {
      floor,
      occupied: floorSeats.filter((seat) => seat.status === 'Occupied').length,
      available: floorSeats.filter((seat) => seat.status === 'Available').length,
    }
  })

  function suggestSeat(projectId) {
    const preferredZone = getProject(projectId).zone
    return (
      seats.find((seat) => seat.status === 'Available' && seat.zone === preferredZone) ||
      seats.find((seat) => seat.status === 'Available')
    )
  }

  function allocateSeat(employeeId) {
    const employee = employees.find((item) => item.id === employeeId)
    if (!employee || employee.seatAllocated) return
    const seat = suggestSeat(employee.projectId)
    if (!seat) {
      setNotice('No available seats found. Please release or activate a reserved seat.')
      return
    }
    setSeats((current) =>
      current.map((item) =>
        item.id === seat.id
          ? {
              ...item,
              status: 'Occupied',
              employeeId: employee.id,
              projectId: employee.projectId,
              allocationDate: new Date().toISOString().slice(0, 10),
            }
          : item,
      ),
    )
    setEmployees((current) =>
      current.map((item) =>
        item.id === employee.id ? { ...item, seatAllocated: true, status: 'Active' } : item,
      ),
    )
    setNotice(`Allocated ${seat.seatNumber} on Floor ${seat.floor}, Zone ${seat.zone} to ${employee.name}.`)
  }

  function releaseSeat(employeeId) {
    const seat = seats.find((item) => item.employeeId === employeeId)
    if (!seat) return
    setSeats((current) =>
      current.map((item) =>
        item.id === seat.id
          ? { ...item, status: 'Available', employeeId: null, projectId: null, allocationDate: null }
          : item,
      ),
    )
    setEmployees((current) =>
      current.map((item) =>
        item.id === employeeId ? { ...item, seatAllocated: false, status: 'Pending Allocation' } : item,
      ),
    )
    setNotice(`Released ${seat.seatNumber}. The seat is available again.`)
  }

  function addEmployee(event) {
    event.preventDefault()
    if (employees.some((employee) => employee.email.toLowerCase() === newEmployee.email.toLowerCase())) {
      setNotice('Duplicate email is not allowed.')
      return
    }
    const employee = {
      id: employees.length + 1,
      employeeCode: `ETH${String(employees.length + 1).padStart(5, '0')}`,
      ...newEmployee,
      projectId: Number(newEmployee.projectId),
      joiningDate: new Date().toISOString().slice(0, 10),
      status: 'Pending Allocation',
      seatAllocated: false,
    }
    setEmployees((current) => [employee, ...current])
    setNotice(`${employee.name} added as a new joiner. Use Allocate to assign a suggested seat.`)
  }

  function answerQuestion(event) {
    event.preventDefault()
    const query = assistantQuery.toLowerCase()
    const email = query.match(/[a-z0-9._%+-]+@ethara\.ai/)?.[0]
    const employee =
      (email && joinedRows.find((row) => row.email.toLowerCase() === email)) ||
      joinedRows.find((row) => query.includes(row.name.split(' ')[0].toLowerCase())) ||
      joinedRows[0]

    if (query.includes('available') && query.includes('floor')) {
      const floor = Number(query.match(/floor\s*(\d)/)?.[1] || 1)
      const available = seats.filter((seat) => seat.floor === floor && seat.status === 'Available').slice(0, 8)
      setAssistantAnswer(
        `Floor ${floor} has ${seats.filter((seat) => seat.floor === floor && seat.status === 'Available').length} available seats. Sample: ${available.map((seat) => seat.seatNumber).join(', ')}.`,
      )
      return
    }

    if (query.includes('occupied') || query.includes('utilization') || query.includes('how many')) {
      const project = projects.find((item) => query.includes(item.name.toLowerCase())) || projects[0]
      const count = seats.filter((seat) => seat.projectId === project.id && seat.status === 'Occupied').length
      setAssistantAnswer(`${count} seats are occupied for Project ${project.name}.`)
      return
    }

    if (query.includes('near')) {
      const near = joinedRows
        .filter((row) => row.seat && employee.seat && row.seat.floor === employee.seat.floor && row.seat.zone === employee.seat.zone && row.id !== employee.id)
        .slice(0, 5)
      setAssistantAnswer(`${employee.name} is near ${near.map((row) => row.name).join(', ') || 'no active neighbors in the same zone'}.`)
      return
    }

    if (query.includes('allocate')) {
      const pending = employees.find((item) => !item.seatAllocated)
      const seat = pending && suggestSeat(pending.projectId)
      setAssistantAnswer(
        pending && seat
          ? `Suggested allocation: ${pending.name} can sit on Floor ${seat.floor}, Zone ${seat.zone}, Bay ${seat.bay}, Seat ${seat.seatNumber} near Project ${getProject(pending.projectId).name}.`
          : 'No pending employee or available seat found.',
      )
      return
    }

    if (!employee.seat) {
      setAssistantAnswer(`${employee.name} is assigned to Project ${employee.project.name}, but seat allocation is pending.`)
      return
    }
    setAssistantAnswer(
      `${employee.name} is seated on Floor ${employee.seat.floor}, Zone ${employee.seat.zone}, Bay ${employee.seat.bay}, Seat ${employee.seat.seatNumber}. Project: ${employee.project.name}.`,
    )
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Ethara workplace operations</p>
          <h1>Seat Allocation & Project Mapping</h1>
        </div>
        <div className="api-pill">Vite Demo</div>
      </header>

      <section className="stats">
        {[
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
                  <td>{row.project.name}</td>
                  <td>{row.seat ? `F${row.seat.floor} Z${row.seat.zone} Bay ${row.seat.bay} Seat ${row.seat.seatNumber}` : 'Not allocated'}</td>
                  <td><mark>{row.seat?.status || row.status}</mark></td>
                  <td>
                    {row.seatAllocated ? (
                      <button type="button" onClick={() => releaseSeat(row.id)}>Release</button>
                    ) : (
                      <button type="button" onClick={() => allocateSeat(row.id)}>Allocate</button>
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
            {projectUtilization.map((project) => (
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
