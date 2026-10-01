import { createServer } from 'node:http'

if (process.env.NODE_ENV !== 'test' || process.env.FACILITY_FAKE_IAM_ENABLED !== 'true') {
  throw new Error('The fake IAM adapter is available only in explicitly enabled test runs.')
}

const employees = [
  { id: '2084344241143070722', username: 'lmadala', email: 'lalith.madala@item.com', displayName: 'Lalith Madala' },
  { id: '3001', username: 'operations.admin', email: 'operations.admin@item.com', displayName: 'Operations Admin' },
  { id: '3002', username: 'configuration.admin', email: 'configuration.admin@item.com', displayName: 'Configuration Admin' },
]
const service = { id: '9999', username: 'fake-service', email: 'service@item.com', displayName: 'Facility Test Service' }
const all = [...employees, service]

const token = (employee: typeof service) => `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ data: { user_id: employee.id, tenant_id: 'LT', user_name: employee.username, email: employee.email } })).toString('base64url')}.test`
async function body(request: import('node:http').IncomingMessage) { const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk)); return JSON.parse(Buffer.concat(chunks).toString() || '{}') as Record<string, unknown> }
const row = (employee: typeof service) => ({ id: employee.id, userName: employee.username, firstName: employee.displayName.split(' ')[0], lastName: employee.displayName.split(' ').slice(1).join(' '), companyCode: 'LT', userStatus: 'ACTIVE', userType: 0, profile: { userId: employee.id, fullName: employee.displayName, facilities: [{ id: 'LT_F1' }] } })

const server = createServer(async (request, response) => {
  response.setHeader('content-type', 'application/json')
  if (request.url === '/health') { response.end('{"ok":true}'); return }
  if (request.url === '/api/auth/password-grant' && request.method === 'POST') {
    const input = await body(request)
    const employee = all.find((item) => item.username === input.username)
    if (!employee || input.password !== 'test-password') { response.statusCode = 401; response.end('{"error":"invalid"}'); return }
    response.end(JSON.stringify({ access_token: token(employee), refresh_token: 'server-test-only', expires_in: 3600 })); return
  }
  const profile = request.url?.match(/^\/wms-bam\/user\/(\d+)$/)
  if (profile) {
    const employee = all.find((item) => item.id === profile[1])
    if (!employee) { response.statusCode = 404; response.end('{}'); return }
    response.end(JSON.stringify({ data: { firstName: employee.displayName.split(' ')[0], lastName: employee.displayName.split(' ').slice(1).join(' '), userName: employee.username, email: employee.email, profile: { facilities: [{ id: 'LT_F1', name: 'Facility Network' }] } } })); return
  }
  if (request.url === '/wms-bam/user/search-by-paging' && request.method === 'POST') {
    const input = await body(request)
    const ids = Array.isArray(input.userIds) ? input.userIds.map(String) : []
    const keyword = String(input.keyword || '').toLowerCase()
    const matches = employees.filter((employee) => ids.length ? ids.includes(employee.id) : employee.username.includes(keyword) || employee.displayName.toLowerCase().includes(keyword))
    const pageSize = Number(input.pageSize)
    response.end(JSON.stringify({ code: '0', data: { currentPage: Number(input.currentPage), pageSize, totalCount: matches.length, totalPage: Math.ceil(matches.length / pageSize), list: matches.map(row) } })); return
  }
  response.statusCode = 404; response.end('{}')
})

server.listen(4212, '127.0.0.1', () => console.log('Fake IAM/WMS listening on 127.0.0.1:4212'))
const close = () => server.close(() => process.exit(0))
process.on('SIGINT', close)
process.on('SIGTERM', close)
