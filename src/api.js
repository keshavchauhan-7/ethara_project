const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`)
  }
  return data
}

function normalizeSeat(seat) {
  if (!seat) return null
  return {
    id: seat.id,
    floor: seat.floor,
    zone: seat.zone,
    bay: seat.bay,
    seatNumber: seat.seat_number,
    status: seat.status,
    employeeId: seat.allocated_employee_id,
    projectId: seat.allocated_project_id,
    allocationDate: seat.allocation_date,
  }
}

function normalizeProject(project) {
  if (!project) return null
  return {
    id: project.id,
    name: project.name,
    manager: project.manager_name,
    zone: project.zone,
    description: project.description,
    status: project.status,
  }
}

function normalizeEmployee(row) {
  const seat = normalizeSeat(row.seat)
  return {
    id: row.id,
    employeeCode: row.employee_code,
    name: row.name,
    email: row.email,
    department: row.department,
    role: row.role,
    joiningDate: row.joining_date,
    status: row.status,
    projectId: row.project_id,
    project: normalizeProject(row.project),
    seat,
    seatAllocated: !!(seat && seat.status === 'Occupied'),
  }
}

export async function fetchEmployees() {
  const rows = await request('/employees')
  return rows.map(normalizeEmployee)
}

export async function fetchProjects() {
  const rows = await request('/projects')
  return rows.map(normalizeProject)
}

export async function fetchSeats() {
  const rows = await request('/seats')
  return rows.map(normalizeSeat)
}

export async function fetchDashboardSummary() {
  const data = await request('/dashboard/summary')
  return {
    employees: data.total_employees,
    seats: data.total_seats,
    occupied: data.occupied_seats,
    available: data.available_seats,
    reserved: data.reserved_seats,
    pending: data.pending_allocation,
  }
}

export async function fetchProjectUtilization() {
  return request('/dashboard/project-utilization')
}

export async function fetchFloorUtilization() {
  return request('/dashboard/floor-utilization')
}

export async function createEmployee(payload) {
  const row = await request('/employees', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      department: payload.department,
      role: payload.role,
      project_id: Number(payload.projectId),
    }),
  })
  return normalizeEmployee(row)
}

export async function updateEmployee(employeeId, payload) {
  const row = await request(`/employees/${employeeId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      department: payload.department,
      role: payload.role,
      status: payload.status,
      project_id: Number(payload.projectId),
    }),
  })
  return normalizeEmployee(row)
}

export async function deleteEmployee(employeeId) {
  const row = await request(`/employees/${employeeId}`, { method: 'DELETE' })
  return normalizeEmployee(row)
}

export async function createProject(payload) {
  const row = await request('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      description: payload.description,
      manager_name: payload.manager,
      status: payload.status,
      zone: payload.zone,
    }),
  })
  return normalizeProject(row)
}

export async function updateProject(projectId, payload) {
  const row = await request(`/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: payload.name,
      description: payload.description,
      manager_name: payload.manager,
      status: payload.status,
      zone: payload.zone,
    }),
  })
  return normalizeProject(row)
}

export async function deleteProject(projectId) {
  const row = await request(`/projects/${projectId}`, { method: 'DELETE' })
  return normalizeProject(row)
}

export async function allocateSeat(employeeId, seatId = null) {
  const result = await request('/seats/allocate', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId, seat_id: seatId }),
  })
  return result
}

export async function releaseSeat(employeeId) {
  const result = await request('/seats/release', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId }),
  })
  return result
}

export async function askAssistant(query) {
  const result = await request('/ai/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
  return result.answer
}

export async function loadAppData() {
  const [employees, projects, seats, summary, projectUtilization, floorUtilization] = await Promise.all([
    fetchEmployees(),
    fetchProjects(),
    fetchSeats(),
    fetchDashboardSummary(),
    fetchProjectUtilization(),
    fetchFloorUtilization(),
  ])
  return { employees, projects, seats, summary, projectUtilization, floorUtilization }
}
