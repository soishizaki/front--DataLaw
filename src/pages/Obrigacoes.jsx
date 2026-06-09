import { useEffect, useState } from 'react'
import { Table, Tag, Input, Select, Space, Typography, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { api } from '../services/api'

const { Title } = Typography

const coresStatus = {
  pending: 'blue',
  completed: 'green',
  overdue: 'red',
}

const labelStatus = {
  pending: 'Pendente',
  completed: 'Concluída',
  overdue: 'Atrasada',
}

const colunas = [
  {
    title: 'Item',
    dataIndex: 'item_number',
    key: 'item_number',
    width: 80,
    render: (v) => v || '—',
  },
  {
    title: 'Obrigação',
    dataIndex: 'obligation_text',
    key: 'obligation_text',
    ellipsis: true,
  },
  {
    title: 'Responsável',
    dataIndex: 'responsible',
    key: 'responsible',
    width: 150,
    render: (v) => v || '—',
  },
  {
    title: 'Recorrência',
    dataIndex: 'recurrence',
    key: 'recurrence',
    width: 130,
    render: (v) => v || '—',
  },
  {
    title: 'Prazo',
    dataIndex: 'deadline',
    key: 'deadline',
    width: 120,
    render: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '—',
  },
  {
    title: 'Tipo',
    dataIndex: 'trigger_family',
    key: 'trigger_family',
    width: 110,
    render: (v) => v ? (
      <Tag color={v === 'eventual' ? 'purple' : 'cyan'}>
        {v.charAt(0).toUpperCase() + v.slice(1)}
      </Tag>
    ) : '—',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 110,
    render: (v) => (
      <Tag color={coresStatus[v] || 'default'}>
        {labelStatus[v] || v}
      </Tag>
    ),
  },
]

function Obrigacoes({ onVerDetalhe, filtroInicial }) {
  const [dados, setDados] = useState([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState(filtroInicial || null)
  const [pagina, setPagina] = useState(1)
  const limite = 15

  const carregar = async (paginaAtual = 1, q = busca, status = filtroStatus) => {
    setCarregando(true)
    try {
      const params = {
        skip: (paginaAtual - 1) * limite,
        limit: limite,
      }
      if (q) params.q = q
      if (status && status !== 'all') params.status = status

      const resultado = await api.obrigacoes.listar(params)
      setDados(resultado.items)
      setTotal(resultado.total)
    } catch (err) {
      message.error('Erro ao carregar obrigações. Verifique se o servidor está rodando.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const onBuscar = (valor) => {
    setBusca(valor)
    setPagina(1)
    carregar(1, valor, filtroStatus)
  }

  const onFiltrarStatus = (valor) => {
    setFiltroStatus(valor)
    setPagina(1)
    carregar(1, busca, valor)
  }

  const onMudarPagina = (novaPagina) => {
    setPagina(novaPagina)
    carregar(novaPagina)
  }

  return (
    <div>
      <Title level={5} style={{ marginBottom: 16 }}>Lista de Obrigações</Title>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Buscar obrigação..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          allowClear
          onPressEnter={(e) => onBuscar(e.target.value)}
          onChange={(e) => { if (!e.target.value) onBuscar('') }}
        />
        <Select
          placeholder="Filtrar por status"
          style={{ width: 180 }}
          allowClear
          onChange={onFiltrarStatus}
          options={[
            { value: 'pending', label: 'Pendente' },
            { value: 'completed', label: 'Concluída' },
            { value: 'overdue', label: 'Atrasada' },
          ]}
        />
      </Space>

      <Table
        dataSource={dados}
        columns={colunas}
        rowKey="id"
        loading={carregando}
        onRow={(record) => ({
          onClick: () => onVerDetalhe(record.id),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: pagina,
          pageSize: limite,
          total: total,
          onChange: onMudarPagina,
          showTotal: (t) => `${t} obrigações`,
        }}
      />
    </div>
  )
}

export default Obrigacoes
