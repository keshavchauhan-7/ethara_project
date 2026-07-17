import http from 'node:http'
import { URL } from 'node:url'

const projects = [
  'Indigo',
  'Indreed',
  'Mydreed',
  'Preed',
  'Serfy',
  'Oreed',
  'bedegreed',
  'Opreed',
  'Serry',
  'Kaary',
  'Mered',
].map((name, index) => ({
  id: index + 1,
  name,
  description: `${name} delivery team`,
  manager_name: ['Rhea Kapoor', 'Omar Khan', 'Maya Iyer', 'Dev Menon'][index % 4],
  status: 'Active',
}))

const zones = ['A', 'B', 'C', 'D', 'E', 'F']
const departments = ['Engineering', 'HR', 'Admin', 'Growth', 'Finance', 'Design']
const roles = ['Developer', 'Analyst', 'Manager', 'Coordinator', 'Designer', 'QA']
const names = ['Amit Sharma', 'Priya Nair', 'Rahul Khan', 'Meera Rao', 'Kabir Das', 'Anaya Shah']

const employees = Array.from({ length: 1000 }, (_, index) => ({
  id: index + 1,
  employee_code: `ETH${String(index + 1).padStart(5, '0')}`,
  name: index === 0 ? 'Amit Sharma' : names[index % names.length],
  email: index === 0 ? 'amit@ethara.ai' : `employee.${index + 1}@ethara.ai`,
  department: departments[index % departments.length],
  role: roles[index % roles.length],
  joining_date: `2026-07-${String((index % 27) + 1).padStart(2, '0')}`,
  status: index >= 980 ? 'Pending Allocation' : 'Active',
  project_id: (index % projects.length) + 1,
}))

const seats = []
for (let floor = 1; floor <= 5; floor += 1) {
  for (const zone of zones) {
    for (let bay = 1; bay <= 10; bay += 1) {
      for (let number = 1; number <= 90; number += 1) {
        if (seats.length === 2500) break
        const index = seats.length
        let status = 'Available'
        if (index < 980) status = 'Occupied'
        else if (index < 1480) status = 'Reserved'
        else if (index < 1630) status = 'Maintenance'
        seats.push({
          id: index + 1,
          floor,
          zone,
          bay,
          seat_number: `${zone}${bay}-${String(number).padStart(2, '0')}`,
          status,
          allocated_employee_id: index < 980 ? index + 1 : null,
          allocated_project_id: index < 980 ? (index % projects.length) + 1 : null,
          allocation_date: index < 980 ? '2026-07-01' : null,
        })
      }
    }
  }
}

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
  return new Promise((resolve) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', () => {
      resolve(body ? JSON.parse(body) : {})
    })
  })
}

function employeeWithSeat(employee) {
  const project = projects.find((item) => item.id === employee.project_id)
  const seat = seats.find((item) => item.allocated_employee_id === employee.id)
  return { ...employee, project, seat }
}

function dashboardSummary() {
  return {
    total_employees: employees.length,
    total_seats: seats.length,
    occupied_seats: seats.filter((seat) => seat.status === 'Occupied').length,
    available_seats: seats.filter((seat) => seat.status === 'Available').length,
    reserved_seats: seats.filter((seat) => seat.status === 'Reserved').length,
    pending_allocation: employees.filter((employee) => employee.status === 'Pending Allocation').length,
  }
}

function answerAiQuery(queryText) {
  const query = String(queryText || '').toLowerCase()
  const email = query.match(/[a-z0-9._%+-]+@ethara\.ai/)?.[0]
  const employee =
    (email && employees.find((item) => item.email.toLowerCase() === email)) ||
    employees.find((item) => query.includes(item.name.split(' ')[0].toLowerCase())) ||
    employees[0]
  const row = employeeWithSeat(employee)

  if (query.includes('available') && query.includes('floor')) {
    const floor = Number(query.match(/floor\s*(\d)/)?.[1] || 1)
    const available = seats.filter((seat) => seat.floor === floor && seat.status === 'Available')
    return `Floor ${floor} has ${available.length} available seats. Sample seats: ${available.slice(0, 5).map((seat) => seat.seat_number).join(', ')}.`
  }

  if (query.includes('how many') || query.includes('occupied')) {
    const project = projects.find((item) => query.includes(item.name.toLowerCase())) || projects[0]
    const count = seats.filter((seat) => seat.allocated_project_id === project.id && seat.status === 'Occupied').length
    return `${count} seats are occupied for Project ${project.name}.`
  }

  if (!row.seat) {
    return `${row.name} is assigned to Project ${row.project.name}, but seat allocation is pending.`
  }

  return `${row.name} is seated on Floor ${row.seat.floor}, Zone ${row.seat.zone}, Bay ${row.seat.bay}, Seat ${row.seat.seat_number}. Project: ${row.project.name}.`
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return send(response, 200, { ok: true })

  const url = new URL(request.url, `http://${request.headers.host}`)
  const path = url.pathname

  if (path === '/') return send(response, 200, { name: 'Ethara Seat Allocation API', status: 'running' })
  if (path === '/employees' && request.method === 'GET') return send(response, 200, employees.map(employeeWithSeat))
  if (path === '/projects' && request.method === 'GET') return send(response, 200, projects)
  if (path.match(/^\/projects\/\d+\/employees$/) && request.method === 'GET') {
    const projectId = Number(path.split('/')[2])
    return send(response, 200, employees.filter((employee) => employee.project_id === projectId).map(employeeWithSeat))
  }
  if (path === '/seats' && request.method === 'GET') return send(response, 200, seats)
  if (path === '/seats/available' && request.method === 'GET') {
    return send(response, 200, seats.filter((seat) => seat.status === 'Available'))
  }
  if (path === '/dashboard/summary' && request.method === 'GET') return send(response, 200, dashboardSummary())
  if (path === '/dashboard/project-utilization' && request.method === 'GET') {
    return send(
      response,
      200,
      projects.map((project) => ({
        project: project.name,
        occupied_seats: seats.filter((seat) => seat.allocated_project_id === project.id && seat.status === 'Occupied').length,
      })),
    )
  }
  if (path === '/dashboard/floor-utilization' && request.method === 'GET') {
    return send(
      response,
      200,
      [1, 2, 3, 4, 5].map((floor) => ({
        floor,
        occupied: seats.filter((seat) => seat.floor === floor && seat.status === 'Occupied').length,
        available: seats.filter((seat) => seat.floor === floor && seat.status === 'Available').length,
      })),
    )
  }
  if (path === '/ai/query' && request.method === 'POST') {
    const body = await readBody(request)
    return send(response, 200, { answer: answerAiQuery(body.query) })
  }

  return send(response, 404, { error: 'Route not found' })
})

const port = process.env.PORT || 4000
const host = process.env.HOST || '0.0.0.0'
server.listen(port, host, () => {
  console.log(`Ethara backend running on http://${host}:${port}`)
})
