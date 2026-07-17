const PROJECT_NAMES = [
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
]

const MANAGERS = ['Rhea Kapoor', 'Omar Khan', 'Maya Iyer', 'Dev Menon', 'Ava Thomas', 'Neil Shah']
const ZONES = ['A', 'B', 'C', 'D', 'E', 'F']
const DEPARTMENTS = ['Engineering', 'HR', 'Admin', 'Growth', 'Finance', 'Design']
const ROLES = ['Developer', 'Analyst', 'Manager', 'Coordinator', 'Designer', 'QA']
const FIRST_NAMES = ['Amit', 'Anaya', 'Rahul', 'Priya', 'Kabir', 'Nisha', 'Arjun', 'Meera', 'Vihaan', 'Tara']
const LAST_NAMES = ['Sharma', 'Nair', 'Khan', 'Rao', 'Das']

export function createSeedData() {
  const projects = PROJECT_NAMES.map((name, index) => ({
    id: index + 1,
    name,
    description: `${name} delivery team`,
    manager_name: MANAGERS[index % MANAGERS.length],
    status: 'Active',
    zone: ZONES[index % ZONES.length],
  }))

  const employees = Array.from({ length: 1000 }, (_, index) => {
    const id = index + 1
    const first = FIRST_NAMES[index % FIRST_NAMES.length]
    const name = index === 0 ? 'Amit Sharma' : `${first} ${LAST_NAMES[index % LAST_NAMES.length]}`
    return {
      id,
      employee_code: `ETH${String(id).padStart(5, '0')}`,
      name,
      email: index === 0 ? 'amit@ethara.ai' : `${first.toLowerCase()}.${id}@ethara.ai`,
      department: DEPARTMENTS[index % DEPARTMENTS.length],
      role: ROLES[index % ROLES.length],
      joining_date: `2026-0${(index % 6) + 1}-${String((index % 27) + 1).padStart(2, '0')}`,
      status: id > 980 ? 'Pending Allocation' : 'Active',
      project_id: (index % projects.length) + 1,
    }
  })

  const seats = []
  for (let floor = 1; floor <= 5; floor += 1) {
    for (const zone of ZONES) {
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

  return {
    projects,
    employees,
    seats,
    counters: {
      employeeId: employees.length,
      seatId: seats.length,
      projectId: projects.length,
    },
  }
}
