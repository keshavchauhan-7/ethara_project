import http from 'node:http'
import { URL } from 'node:url'
import { loadStore, saveStore } from './store.js'

const store = loadStore()

function send(response, status, payload) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  })
  response.end(JSON.stringify(payload, null, 2))
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    request.on('error', reject)
  })
}

function employeeWithSeat(employee) {
  const project = store.projects.find((item) => item.id === employee.project_id)
  const seat = store.seats.find((item) => item.allocated_employee_id === employee.id)
  return { ...employee, project, seat: seat || null }
}

function getProject(projectId) {
  return store.projects.find((item) => item.id === Number(projectId))
}

function suggestSeat(projectId) {
  const project = getProject(projectId)
  const preferredZone = project?.zone
  return (
    store.seats.find((seat) => seat.status === 'Available' && seat.zone === preferredZone) ||
    store.seats.find((seat) => seat.status === 'Available')
  )
}

function dashboardSummary() {
  return {
    total_employees: store.employees.filter((e) => e.status !== 'Inactive').length,
    total_seats: store.seats.length,
    occupied_seats: store.seats.filter((seat) => seat.status === 'Occupied').length,
    available_seats: store.seats.filter((seat) => seat.status === 'Available').length,
    reserved_seats: store.seats.filter((seat) => seat.status === 'Reserved').length,
    pending_allocation: store.employees.filter((employee) => employee.status === 'Pending Allocation').length,
  }
}

function answerAiQuery(queryText) {
  const query = String(queryText || '').toLowerCase()
  const email = query.match(/[a-z0-9._%+-]+@ethara\.ai/)?.[0]
  const employee =
    (email && store.employees.find((item) => item.email.toLowerCase() === email)) ||
    store.employees.find((item) => query.includes(item.name.split(' ')[0].toLowerCase())) ||
    store.employees[0]
  const row = employeeWithSeat(employee)

  if (query.includes('available') && query.includes('floor')) {
    const floor = Number(query.match(/floor\s*(\d)/)?.[1] || 1)
    const available = store.seats.filter((seat) => seat.floor === floor && seat.status === 'Available')
    return `Floor ${floor} has ${available.length} available seats. Sample seats: ${available.slice(0, 8).map((seat) => seat.seat_number).join(', ')}.`
  }

  if (query.includes('how many') || query.includes('occupied') || query.includes('utilization')) {
    const project = store.projects.find((item) => query.includes(item.name.toLowerCase())) || store.projects[0]
    const count = store.seats.filter((seat) => seat.allocated_project_id === project.id && seat.status === 'Occupied').length
    return `${count} seats are occupied for Project ${project.name}.`
  }

  if (query.includes('near')) {
    const near = store.employees
      .map(employeeWithSeat)
      .filter(
        (item) =>
          item.seat &&
          row.seat &&
          item.seat.floor === row.seat.floor &&
          item.seat.zone === row.seat.zone &&
          item.id !== row.id,
      )
      .slice(0, 5)
    return `${row.name} is near ${near.map((item) => item.name).join(', ') || 'no active neighbors in the same zone'}.`
  }

  if (query.includes('allocate')) {
    const pending = store.employees.find((item) => item.status === 'Pending Allocation')
    const seat = pending && suggestSeat(pending.project_id)
    if (pending && seat) {
      const project = getProject(pending.project_id)
      return `Suggested allocation: ${pending.name} can sit on Floor ${seat.floor}, Zone ${seat.zone}, Bay ${seat.bay}, Seat ${seat.seat_number} near Project ${project.name}.`
    }
    return 'No pending employee or available seat found.'
  }

  if (!row.seat) {
    return `${row.name} is assigned to Project ${row.project?.name || 'Unknown'}, but seat allocation is pending.`
  }

  return `${row.name} is seated on Floor ${row.seat.floor}, Zone ${row.seat.zone}, Bay ${row.seat.bay}, Seat ${row.seat.seat_number}. Project: ${row.project.name}.`
}

function createEmployee(body) {
  const email = String(body.email || '').trim().toLowerCase()
  if (!body.name || !email) {
    return { error: 'Name and email are required.', status: 400 }
  }
  if (store.employees.some((item) => item.email.toLowerCase() === email)) {
    return { error: 'Duplicate email is not allowed.', status: 409 }
  }

  store.counters.employeeId += 1
  const id = store.counters.employeeId
  const employee = {
    id,
    employee_code: `ETH${String(id).padStart(5, '0')}`,
    name: body.name,
    email,
    department: body.department || 'Engineering',
    role: body.role || 'Developer',
    joining_date: body.joining_date || new Date().toISOString().slice(0, 10),
    status: 'Pending Allocation',
    project_id: Number(body.project_id) || 1,
  }
  store.employees.unshift(employee)
  saveStore()
  return { data: employeeWithSeat(employee), status: 201 }
}

function updateEmployee(id, body) {
  const employee = store.employees.find((item) => item.id === id)
  if (!employee) return { error: 'Employee not found.', status: 404 }

  if (body.email) {
    const email = String(body.email).trim().toLowerCase()
    if (store.employees.some((item) => item.id !== id && item.email.toLowerCase() === email)) {
      return { error: 'Duplicate email is not allowed.', status: 409 }
    }
    employee.email = email
  }

  if (body.name) employee.name = body.name
  if (body.department) employee.department = body.department
  if (body.role) employee.role = body.role
  if (body.project_id) employee.project_id = Number(body.project_id)
  if (body.status) employee.status = body.status

  saveStore()
  return { data: employeeWithSeat(employee), status: 200 }
}

function deactivateEmployee(id) {
  const employee = store.employees.find((item) => item.id === id)
  if (!employee) return { error: 'Employee not found.', status: 404 }

  const seat = store.seats.find((item) => item.allocated_employee_id === id)
  if (seat) {
    seat.status = 'Available'
    seat.allocated_employee_id = null
    seat.allocated_project_id = null
    seat.allocation_date = null
  }

  employee.status = 'Inactive'
  saveStore()
  return { data: employeeWithSeat(employee), status: 200 }
}

function createProject(body) {
  const name = String(body.name || '').trim()
  if (!name) return { error: 'Project name is required.', status: 400 }
  if (store.projects.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    return { error: 'Project already exists.', status: 409 }
  }

  store.counters.projectId += 1
  const project = {
    id: store.counters.projectId,
    name,
    description: body.description || `${name} delivery team`,
    manager_name: body.manager_name || 'TBD',
    status: body.status || 'Active',
    zone: body.zone || 'A',
  }
  store.projects.push(project)
  saveStore()
  return { data: project, status: 201 }
}

function updateProject(id, body) {
  const project = store.projects.find((item) => item.id === id)
  if (!project) return { error: 'Project not found.', status: 404 }

  const name = String(body.name || project.name).trim()
  if (!name) return { error: 'Project name is required.', status: 400 }
  if (store.projects.some((item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) {
    return { error: 'Project already exists.', status: 409 }
  }

  project.name = name
  project.description = body.description || project.description
  project.manager_name = body.manager_name || project.manager_name
  project.status = body.status || project.status
  project.zone = body.zone || project.zone

  saveStore()
  return { data: project, status: 200 }
}

function deleteProject(id) {
  const project = store.projects.find((item) => item.id === id)
  if (!project) return { error: 'Project not found.', status: 404 }

  const activeEmployees = store.employees.filter((employee) => employee.project_id === id && employee.status !== 'Inactive')
  if (activeEmployees.length) {
    return { error: 'Move employees to another project before deleting this project.', status: 409 }
  }

  store.projects = store.projects.filter((item) => item.id !== id)
  store.seats.forEach((seat) => {
    if (seat.allocated_project_id === id) seat.allocated_project_id = null
  })
  saveStore()
  return { data: project, status: 200 }
}

function createSeat(body) {
  const floor = Number(body.floor)
  const zone = String(body.zone || '').trim()
  const bay = Number(body.bay)
  const seatNumber = String(body.seat_number || '').trim()

  if (!floor || !zone || !bay || !seatNumber) {
    return { error: 'floor, zone, bay, and seat_number are required.', status: 400 }
  }

  if (store.seats.some((item) => item.floor === floor && item.zone === zone && item.seat_number === seatNumber)) {
    return { error: 'Duplicate seat number on the same floor and zone.', status: 409 }
  }

  store.counters.seatId += 1
  const seat = {
    id: store.counters.seatId,
    floor,
    zone,
    bay,
    seat_number: seatNumber,
    status: body.status || 'Available',
    allocated_employee_id: null,
    allocated_project_id: null,
    allocation_date: null,
  }
  store.seats.push(seat)
  saveStore()
  return { data: seat, status: 201 }
}

function allocateSeat(body) {
  const employeeId = Number(body.employee_id)
  const requestedSeatId = Number(body.seat_id)
  const employee = store.employees.find((item) => item.id === employeeId)
  if (!employee) return { error: 'Employee not found.', status: 404 }
  if (employee.status === 'Inactive') return { error: 'Inactive employee cannot be allocated.', status: 400 }

  const existing = store.seats.find((item) => item.allocated_employee_id === employeeId && item.status === 'Occupied')
  if (existing) return { error: 'Employee already has an active seat.', status: 409 }

  const seat = requestedSeatId
    ? store.seats.find((item) => item.id === requestedSeatId)
    : suggestSeat(employee.project_id)
  if (!seat) return { error: 'No available seats found.', status: 409 }
  if (seat.status !== 'Available') return { error: 'Selected seat is not available.', status: 409 }

  seat.status = 'Occupied'
  seat.allocated_employee_id = employee.id
  seat.allocated_project_id = employee.project_id
  seat.allocation_date = new Date().toISOString().slice(0, 10)
  employee.status = 'Active'

  saveStore()
  return {
    data: {
      employee: employeeWithSeat(employee),
      seat,
      message: `Allocated ${seat.seat_number} on Floor ${seat.floor}, Zone ${seat.zone} to ${employee.name}.`,
    },
    status: 200,
  }
}

function releaseSeat(body) {
  const employeeId = Number(body.employee_id)
  const employee = store.employees.find((item) => item.id === employeeId)
  if (!employee) return { error: 'Employee not found.', status: 404 }

  const seat = store.seats.find((item) => item.allocated_employee_id === employeeId)
  if (!seat) return { error: 'No seat allocated to this employee.', status: 404 }

  const seatNumber = seat.seat_number
  seat.status = 'Available'
  seat.allocated_employee_id = null
  seat.allocated_project_id = null
  seat.allocation_date = null
  employee.status = 'Pending Allocation'

  saveStore()
  return {
    data: {
      employee: employeeWithSeat(employee),
      seat,
      message: `Released ${seatNumber}. The seat is available again.`,
    },
    status: 200,
  }
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return send(response, 200, { ok: true })

  const url = new URL(request.url, `http://${request.headers.host}`)
  const path = url.pathname
  const method = request.method

  try {
    if (path === '/' && method === 'GET') {
      return send(response, 200, { name: 'Ethara Seat Allocation API', status: 'running', persistence: 'json' })
    }

    if (path === '/employees' && method === 'GET') {
      const active = store.employees.filter((e) => e.status !== 'Inactive')
      return send(response, 200, active.map(employeeWithSeat))
    }

    if (path === '/employees' && method === 'POST') {
      const body = await readBody(request)
      const result = createEmployee(body)
      if (result.error) return send(response, result.status, { error: result.error })
      return send(response, result.status, result.data)
    }

    if (path.match(/^\/employees\/\d+$/) && method === 'GET') {
      const id = Number(path.split('/')[2])
      const employee = store.employees.find((item) => item.id === id)
      if (!employee) return send(response, 404, { error: 'Employee not found.' })
      return send(response, 200, employeeWithSeat(employee))
    }

    if (path.match(/^\/employees\/\d+$/) && method === 'PUT') {
      const id = Number(path.split('/')[2])
      const body = await readBody(request)
      const result = updateEmployee(id, body)
      if (result.error) return send(response, result.status, { error: result.error })
      return send(response, result.status, result.data)
    }

    if (path.match(/^\/employees\/\d+$/) && method === 'DELETE') {
      const id = Number(path.split('/')[2])
      const result = deactivateEmployee(id)
      if (result.error) return send(response, result.status, { error: result.error })
      return send(response, result.status, result.data)
    }

    if (path === '/projects' && method === 'GET') {
      return send(response, 200, store.projects)
    }

    if (path === '/projects' && method === 'POST') {
      const body = await readBody(request)
      const result = createProject(body)
      if (result.error) return send(response, result.status, { error: result.error })
      return send(response, result.status, result.data)
    }

    if (path.match(/^\/projects\/\d+$/) && method === 'PUT') {
      const id = Number(path.split('/')[2])
      const body = await readBody(request)
      const result = updateProject(id, body)
      if (result.error) return send(response, result.status, { error: result.error })
      return send(response, result.status, result.data)
    }

    if (path.match(/^\/projects\/\d+$/) && method === 'DELETE') {
      const id = Number(path.split('/')[2])
      const result = deleteProject(id)
      if (result.error) return send(response, result.status, { error: result.error })
      return send(response, result.status, result.data)
    }

    if (path.match(/^\/projects\/\d+\/employees$/) && method === 'GET') {
      const projectId = Number(path.split('/')[2])
      const list = store.employees.filter((employee) => employee.project_id === projectId && employee.status !== 'Inactive')
      return send(response, 200, list.map(employeeWithSeat))
    }

    if (path === '/seats' && method === 'GET') {
      return send(response, 200, store.seats)
    }

    if (path === '/seats' && method === 'POST') {
      const body = await readBody(request)
      const result = createSeat(body)
      if (result.error) return send(response, result.status, { error: result.error })
      return send(response, result.status, result.data)
    }

    if (path === '/seats/available' && method === 'GET') {
      return send(response, 200, store.seats.filter((seat) => seat.status === 'Available'))
    }

    if (path === '/seats/allocate' && method === 'POST') {
      const body = await readBody(request)
      const result = allocateSeat(body)
      if (result.error) return send(response, result.status, { error: result.error })
      return send(response, result.status, result.data)
    }

    if (path === '/seats/release' && method === 'POST') {
      const body = await readBody(request)
      const result = releaseSeat(body)
      if (result.error) return send(response, result.status, { error: result.error })
      return send(response, result.status, result.data)
    }

    if (path === '/dashboard/summary' && method === 'GET') {
      return send(response, 200, dashboardSummary())
    }

    if (path === '/dashboard/project-utilization' && method === 'GET') {
      return send(
        response,
        200,
        store.projects.map((project) => ({
          project: project.name,
          project_id: project.id,
          occupied_seats: store.seats.filter((seat) => seat.allocated_project_id === project.id && seat.status === 'Occupied').length,
        })),
      )
    }

    if (path === '/dashboard/floor-utilization' && method === 'GET') {
      return send(
        response,
        200,
        [1, 2, 3, 4, 5].map((floor) => ({
          floor,
          occupied: store.seats.filter((seat) => seat.floor === floor && seat.status === 'Occupied').length,
          available: store.seats.filter((seat) => seat.floor === floor && seat.status === 'Available').length,
        })),
      )
    }

    if (path === '/ai/query' && method === 'POST') {
      const body = await readBody(request)
      return send(response, 200, { answer: answerAiQuery(body.query) })
    }

    return send(response, 404, { error: 'Route not found' })
  } catch (error) {
    return send(response, 400, { error: error.message || 'Bad request' })
  }
})

const port = process.env.PORT || 4000
const host = process.env.HOST || '0.0.0.0'
server.listen(port, host, () => {
  console.log(`Ethara backend running on http://${host}:${port}`)
  console.log(`Data persisted to backend/data.json`)
})
