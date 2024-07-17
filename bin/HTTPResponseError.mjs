
export class HTTPResponseError extends Error {
  constructor(response) {
    super(`HTTP Error Response: ${response.status} ${response.statusText}`)
    this.response = JSON.stringify(response, null, '/t')
  }
  response
}