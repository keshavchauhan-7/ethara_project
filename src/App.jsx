import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  allocateSeat as apiAllocateSeat,
  askAssistant,
  createEmployee,
  createProject,
  deleteEmployee,
  deleteProject,
  loadAppData,
  releaseSeat as apiReleaseSeat,
  updateEmployee,
  updateProject,
} from './api'
import './App.css'

const zones = ['A', 'B', 'C', 'D', 'E', 'F']
const statuses = ['Available', 'Occupied', 'Reserved', 'Maintenance']
const tabs = ['Command Center', 'Employees', 'Projects', 'Seat Map']
const emptyEmployee = {
  name: 'New Joiner',
  email: 'new.joiner@ethara.ai',
  department: 'Engineering',
  role: 'Developer',
  projectId: 1,
  status: 'Pending Allocation',
}
const emptyProject = {
  name: 'Nova Workspace',
  manager: 'TBD',
  description: 'AI operations delivery squad',
  status: 'Active',
  zone: 'A',
}

function employeeSeatLabel(seat) {
  return seat ? `F${seat.floor} Z${seat.zone} Bay ${seat.bay} Seat ${seat.seatNumber}` : 'Not allocated'
}

function App() {
  const [activeTab, setActiveTab] = useState('Command Center')
  const [employees, setEmployees] = useState([])
  const [projects, setProjects] = useState([])
  const [seats, setSeats] = useState([])
  const [summary, setSummary] = useState(null)
  const [projectUtilization, setProjectUtilization] = useState([])
  const [floorUtilization, setFloorUtilization] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', project: 'All', floor: 'All', zone: 'All', status: 'All' })
  const [mapFilters, setMapFilters] = useState({ floor: 1, zone: 'A' })
  const [assistantQuery, setAssistantQuery] = useState('Where is employee Amit seated?')
  const [assistantAnswer, setAssistantAnswer] = useState('')
  const [newEmployee, setNewEmployee] = useState(emptyEmployee)
  const [newProject, setNewProject] = useState(emptyProject)
  const [editingEmployeeId, setEditingEmployeeId] = useState(null)
  const [editingProjectId, setEditingProjectId] = useState(null)
  const [employeeDraft, setEmployeeDraft] = useState(emptyEmployee)
  const [projectDraft, setProjectDraft] = useState(emptyProject)
  const [allocation, setAllocation] = useState({ employeeId: '', seatId: '' })
  const [notice, setNotice] = useState('Loading data from backend...')

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
      .then((data) => {
        setNotice('Live backend connected. Employee, project, and seat changes are persisted.')
        setNewEmployee((current) => ({ ...current, projectId: data.projects[0]?.id || 1 }))
      })
      .catch(() => setNotice('Backend unavailable. Start it with: npm run backend'))
      .finally(() => setLoading(false))
  }, [refreshData])

  const filteredRows = useMemo(() => {
    return employees.filter((row) => {
      const projectName = row.project?.name || ''
      const text = `${row.name} ${row.employeeCode} ${row.email} ${row.department} ${projectName}`.toLowerCase()
      return (
        text.includes(filters.search.toLowerCase()) &&
        (filters.project === 'All' || projectName === filters.project) &&
        (filters.floor === 'All' || row.seat?.floor === Number(filters.floor)) &&
        (filters.zone === 'All' || row.seat?.zone === filters.zone) &&
        (filters.status === 'All' || row.seat?.status === filters.status || row.status === filters.status)
      )
    })
  }, [employees, filters])

  const availableSeats = useMemo(() => seats.filter((seat) => seat.status === 'Available'), [seats])
  const visibleSeats = useMemo(() => {
    return seats
      .filter((seat) => seat.floor === Number(mapFilters.floor) && seat.zone === mapFilters.zone)
      .slice(0, 90)
  }, [seats, mapFilters])

  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees])
  const projectBars = projects.map((project) => {
    const util = projectUtilization.find((item) => item.project_id === project.id)
    return { ...project, occupied: util?.occupied_seats || 0 }
  })

  function setEmployeeField(field, value) {
    setNewEmployee((current) => ({ ...current, [field]: value }))
  }

  async function reloadWithNotice(message) {
    await refreshData()
    setNotice(message)
  }

  async function handleAllocate(employeeId = allocation.employeeId, seatId = allocation.seatId) {
    try {
      const result = await apiAllocateSeat(Number(employeeId), seatId ? Number(seatId) : null)
      await reloadWithNotice(result.message)
      setAllocation({ employeeId: '', seatId: '' })
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function handleRelease(employeeId) {
    try {
      const result = await apiReleaseSeat(employeeId)
      await reloadWithNotice(result.message)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function addEmployee(event) {
    event.preventDefault()
    try {
      const employee = await createEmployee(newEmployee)
      await reloadWithNotice(`${employee.name} added. Assign a specific seat from the Seat Map or employee row.`)
      setNewEmployee({ ...emptyEmployee, email: `joiner.${Date.now()}@ethara.ai`, projectId: projects[0]?.id || 1 })
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function saveEmployee(event) {
    event.preventDefault()
    try {
      const employee = await updateEmployee(editingEmployeeId, employeeDraft)
      await reloadWithNotice(`${employee.name} updated successfully.`)
      setEditingEmployeeId(null)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function removeEmployee(employee) {
    if (!window.confirm(`Delete ${employee.name}? Their seat will be released.`)) return
    try {
      await deleteEmployee(employee.id)
      await reloadWithNotice(`${employee.name} removed and any assigned seat was released.`)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function addProject(event) {
    event.preventDefault()
    try {
      const project = await createProject(newProject)
      await reloadWithNotice(`${project.name} project created.`)
      setNewProject({ ...emptyProject, name: `Project ${Date.now().toString().slice(-4)}` })
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function saveProject(event) {
    event.preventDefault()
    try {
      const project = await updateProject(editingProjectId, projectDraft)
      await reloadWithNotice(`${project.name} project updated.`)
      setEditingProjectId(null)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function removeProject(project) {
    if (!window.confirm(`Delete project ${project.name}? It must have no active employees.`)) return
    try {
      await deleteProject(project.id)
      await reloadWithNotice(`${project.name} project deleted.`)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function answerQuestion(event) {
    event.preventDefault()
    try {
      setAssistantAnswer(await askAssistant(assistantQuery))
    } catch (error) {
      setAssistantAnswer(`Error: ${error.message}`)
    }
  }

  function startEmployeeEdit(employee) {
    setEditingEmployeeId(employee.id)
    setEmployeeDraft({
      name: employee.name,
      email: employee.email,
      department: employee.department,
      role: employee.role,
      projectId: employee.projectId,
      status: employee.status,
    })
  }

  function startProjectEdit(project) {
    setEditingProjectId(project.id)
    setProjectDraft({
      name: project.name,
      manager: project.manager,
      description: project.description,
      status: project.status,
      zone: project.zone,
    })
  }

  if (loading) {
    return (
      <main>
        <p className="notice">Loading Ethara seat allocation data...</p>
      </main>
    )
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Ethara AI workplace command</p>
          <h1>Seat, Employee & Project Intelligence</h1>
        </div>
        <div className="api-pill">Live Ops API</div>
      </header>

      <nav className="tabs" aria-label="Main sections">
        {tabs.map((tab) => (
          <button className={activeTab === tab ? 'active' : ''} key={tab} type="button" onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </nav>

      <section className="stats">
        {summary &&
          [
            ['Employees', summary.employees],
            ['Seats', summary.seats],
            ['Occupied', summary.occupied],
            ['Available', summary.available],
            ['Reserved', summary.reserved],
            ['Pending', summary.pending],
          ].map(([label, value]) => (
            <article className="stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
      </section>

      <p className="notice">{notice}</p>

      {activeTab === 'Command Center' && (
        <>
          <section className="grid two">
            <div className="panel hero-panel">
              <h2>AI Assistant</h2>
              <form className="assistant" onSubmit={answerQuestion}>
                <input value={assistantQuery} onChange={(event) => setAssistantQuery(event.target.value)} />
                <button type="submit">Ask</button>
              </form>
              <p className="answer">{assistantAnswer || 'Try: Where is my seat? My email is amit@ethara.ai'}</p>
              <div className="quick-questions">
                {['Show all available seats on Floor 3', 'Who is sitting near me?', 'How many seats are occupied for Project Indigo?', 'Allocate a seat for a new employee joining today'].map((question) => (
                  <button key={question} type="button" onClick={() => setAssistantQuery(question)}>
                    {question}
                  </button>
                ))}
              </div>
            </div>
            <div className="panel">
              <h2>Exact Seat Assignment</h2>
              <div className="form">
                <select value={allocation.employeeId} onChange={(event) => setAllocation({ ...allocation, employeeId: event.target.value })}>
                  <option value="">Choose employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.name} - {employee.employeeCode}</option>
                  ))}
                </select>
                <select value={allocation.seatId} onChange={(event) => setAllocation({ ...allocation, seatId: event.target.value })}>
                  <option value="">AI suggested seat</option>
                  {availableSeats.slice(0, 500).map((seat) => (
                    <option key={seat.id} value={seat.id}>{employeeSeatLabel(seat)}</option>
                  ))}
                </select>
                <button type="button" onClick={() => handleAllocate()}>Assign Seat</button>
              </div>
            </div>
          </section>

          <section className="grid two">
            <UtilizationPanel title="Project Utilization" rows={projectBars.map((project) => ({ label: project.name, value: project.occupied, width: Math.min(project.occupied, 120) }))} />
            <UtilizationPanel title="Floor Occupancy" rows={floorUtilization.map((floor) => ({ label: `Floor ${floor.floor}`, value: `${floor.occupied} occ / ${floor.available} free`, width: Math.min(floor.occupied / 2, 160) }))} />
          </section>
        </>
      )}

      {activeTab === 'Employees' && (
        <>
          <section className="panel">
            <div className="section-head">
              <h2>Add Employee</h2>
              <span>Full create, update, delete workflow</span>
            </div>
            <EmployeeForm employee={newEmployee} projects={projects} onChange={setEmployeeField} onSubmit={addEmployee} submitLabel="Add Employee" />
          </section>
          <EmployeeTable
            employees={filteredRows}
            filters={filters}
            projects={projects}
            editingEmployeeId={editingEmployeeId}
            employeeDraft={employeeDraft}
            setEmployeeDraft={setEmployeeDraft}
            setFilters={setFilters}
            onEdit={startEmployeeEdit}
            onSave={saveEmployee}
            onCancel={() => setEditingEmployeeId(null)}
            onDelete={removeEmployee}
            onAllocate={handleAllocate}
            onRelease={handleRelease}
          />
        </>
      )}

      {activeTab === 'Projects' && (
        <section className="grid two align-start">
          <div className="panel">
            <h2>Create Project</h2>
            <ProjectForm project={newProject} onChange={setNewProject} onSubmit={addProject} submitLabel="Create Project" />
          </div>
          <div className="panel">
            <div className="section-head">
              <h2>Manage Projects</h2>
              <span>{projects.length} active teams</span>
            </div>
            <div className="project-list">
              {projects.map((project) => (
                <article className="project-card" key={project.id}>
                  {editingProjectId === project.id ? (
                    <ProjectForm project={projectDraft} onChange={setProjectDraft} onSubmit={saveProject} submitLabel="Save" onCancel={() => setEditingProjectId(null)} />
                  ) : (
                    <>
                      <div>
                        <strong>{project.name}</strong>
                        <span>{project.manager} | Zone {project.zone} | {project.status}</span>
                        <p>{project.description}</p>
                      </div>
                      <div className="row-actions">
                        <button type="button" onClick={() => startProjectEdit(project)}>Edit</button>
                        <button className="ghost danger" type="button" onClick={() => removeProject(project)}>Delete</button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'Seat Map' && (
        <section className="panel">
          <div className="section-head">
            <h2>Overall Seat Arrangement</h2>
            <span>{visibleSeats.length} seats shown</span>
          </div>
          <div className="map-controls">
            <select value={mapFilters.floor} onChange={(event) => setMapFilters({ ...mapFilters, floor: Number(event.target.value) })}>
              {[1, 2, 3, 4, 5].map((floor) => <option key={floor} value={floor}>Floor {floor}</option>)}
            </select>
            <select value={mapFilters.zone} onChange={(event) => setMapFilters({ ...mapFilters, zone: event.target.value })}>
              {zones.map((zone) => <option key={zone}>{zone}</option>)}
            </select>
            <div className="legend">
              {statuses.map((status) => <span key={status}><i className={`seat-dot ${status.toLowerCase()}`} />{status}</span>)}
            </div>
          </div>
          <div className="seat-map">
            {visibleSeats.map((seat) => {
              const employee = employeeById.get(seat.employeeId)
              const isSelected = Number(allocation.seatId) === seat.id
              return (
                <button
                  className={`seat ${seat.status.toLowerCase()} ${isSelected ? 'selected' : ''}`}
                  disabled={seat.status !== 'Available'}
                  key={seat.id}
                  title={employee ? `${seat.seatNumber}: ${employee.name}` : `${seat.seatNumber}: ${seat.status}`}
                  type="button"
                  onClick={() => {
                    setAllocation({ ...allocation, seatId: String(seat.id) })
                    setActiveTab('Command Center')
                  }}
                >
                  <span>{seat.seatNumber}</span>
                  <small>{employee?.name.split(' ')[0] || seat.status}</small>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}

function EmployeeForm({ employee, projects, onChange, onSubmit, submitLabel }) {
  return (
    <form className="form employee-form" onSubmit={onSubmit}>
      <input placeholder="Name" value={employee.name} onChange={(event) => onChange('name', event.target.value)} />
      <input placeholder="Email" value={employee.email} onChange={(event) => onChange('email', event.target.value)} />
      <input placeholder="Department" value={employee.department} onChange={(event) => onChange('department', event.target.value)} />
      <input placeholder="Role" value={employee.role} onChange={(event) => onChange('role', event.target.value)} />
      <select value={employee.projectId} onChange={(event) => onChange('projectId', event.target.value)}>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
      <select value={employee.status} onChange={(event) => onChange('status', event.target.value)}>
        <option>Active</option>
        <option>Pending Allocation</option>
      </select>
      <button type="submit">{submitLabel}</button>
    </form>
  )
}

function EmployeeTable({ employees, filters, projects, editingEmployeeId, employeeDraft, setEmployeeDraft, setFilters, onEdit, onSave, onCancel, onDelete, onAllocate, onRelease }) {
  return (
    <section className="panel">
      <div className="section-head">
        <h2>Employee Directory</h2>
        <span>{employees.length} records</span>
      </div>
      <div className="filters">
        <input placeholder="Name, ID, email, project" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select value={filters.project} onChange={(event) => setFilters({ ...filters, project: event.target.value })}>
          <option>All</option>
          {projects.map((project) => <option key={project.id}>{project.name}</option>)}
        </select>
        <select value={filters.floor} onChange={(event) => setFilters({ ...filters, floor: event.target.value })}>
          <option>All</option>
          {[1, 2, 3, 4, 5].map((floor) => <option key={floor}>{floor}</option>)}
        </select>
        <select value={filters.zone} onChange={(event) => setFilters({ ...filters, zone: event.target.value })}>
          <option>All</option>
          {zones.map((zone) => <option key={zone}>{zone}</option>)}
        </select>
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option>All</option>
          {[...statuses, 'Pending Allocation'].map((status) => <option key={status}>{status}</option>)}
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.slice(0, 40).map((row) => (
              <tr key={row.id}>
                {editingEmployeeId === row.id ? (
                  <td colSpan="5">
                    <EmployeeForm
                      employee={employeeDraft}
                      projects={projects}
                      onChange={(field, value) => setEmployeeDraft({ ...employeeDraft, [field]: value })}
                      onSubmit={onSave}
                      submitLabel="Save"
                    />
                    <button className="ghost" type="button" onClick={onCancel}>Cancel</button>
                  </td>
                ) : (
                  <>
                    <td><strong>{row.name}</strong><span>{row.employeeCode} | {row.email}</span></td>
                    <td>{row.project?.name}</td>
                    <td>{employeeSeatLabel(row.seat)}</td>
                    <td><mark>{row.seat?.status || row.status}</mark></td>
                    <td>
                      <div className="row-actions">
                        <button type="button" onClick={() => onEdit(row)}>Edit</button>
                        {row.seatAllocated ? (
                          <button className="ghost" type="button" onClick={() => onRelease(row.id)}>Release</button>
                        ) : (
                          <button className="ghost" type="button" onClick={() => onAllocate(row.id)}>Auto Seat</button>
                        )}
                        <button className="ghost danger" type="button" onClick={() => onDelete(row)}>Delete</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ProjectForm({ project, onChange, onSubmit, submitLabel, onCancel }) {
  return (
    <form className="form project-form" onSubmit={onSubmit}>
      <input placeholder="Project name" value={project.name} onChange={(event) => onChange({ ...project, name: event.target.value })} />
      <input placeholder="Manager" value={project.manager} onChange={(event) => onChange({ ...project, manager: event.target.value })} />
      <input placeholder="Description" value={project.description} onChange={(event) => onChange({ ...project, description: event.target.value })} />
      <select value={project.zone} onChange={(event) => onChange({ ...project, zone: event.target.value })}>
        {zones.map((zone) => <option key={zone}>{zone}</option>)}
      </select>
      <select value={project.status} onChange={(event) => onChange({ ...project, status: event.target.value })}>
        <option>Active</option>
        <option>Paused</option>
        <option>Completed</option>
      </select>
      <button type="submit">{submitLabel}</button>
      {onCancel && <button className="ghost" type="button" onClick={onCancel}>Cancel</button>}
    </form>
  )
}

function UtilizationPanel({ title, rows }) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      <div className="bars">
        {rows.map((row) => (
          <div className="bar-row" key={row.label}>
            <span>{row.label}</span>
            <div><i style={{ width: `${row.width}px` }} /></div>
            <b>{row.value}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
