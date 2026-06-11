const BASE_URL = '/api/v1'

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    let detail = `Erro ${response.status}: ${response.statusText}`
    try {
      const body = await response.json()
      if (body.detail) detail = body.detail
    } catch {}
    throw new Error(detail)
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
    buscarDependentes: (id) => request(`/obligations/${id}/dependents`),
    deletar: (id) =>
      request(`/obligations/${id}`, { method: 'DELETE' }),
    criar: (dados) =>
      request('/obligations/', {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
  },
  contratos: {
    listar: () => request('/contracts/'),
  },
  configuracoes: {
    buscar: () => request('/settings'),
    salvar: (dados) =>
      request('/settings', { method: 'PATCH', body: JSON.stringify(dados) }),
  },
}
