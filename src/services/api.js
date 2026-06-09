const BASE_URL = '/api/v1'

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    throw new Error(`Erro ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

export const api = {
  obrigacoes: {
    listar: (params = {}) => {
      const query = new URLSearchParams(params).toString()
      return request(`/obligations/${query ? '?' + query : ''}`)
    },
    buscarPorId: (id) => request(`/obligations/${id}`),
    atualizar: (id, dados) =>
      request(`/obligations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dados),
      }),
    enviarEmail: (id) =>
      request(`/obligations/${id}/send-email`, { method: 'POST' }),
    criar: (dados) =>
      request('/obligations/', {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
  },
  contratos: {
    listar: () => request('/contracts/'),
  },
}
