import { useEffect, useRef, useState } from 'react'
import { Table, Tag, Input, Select, Space, Typography, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { api } from '../services/api'

const { Title } = Typography

const labelStatus = {
  pending: 'Pendente',
  completed: 'Concluída',
  overdue: 'Atrasada',
}

function TagStatus({ status }) {
  if (status === 'pending')
    return <Tag style={{ backgroundColor: '#FFF3EE', borderColor: '#E8673A', color: '#E8673A' }}>Pendente</Tag>
  if (status === 'completed')
    return <Tag color="green">Concluída</Tag>
  if (status === 'overdue')
    return <Tag color="red">Atrasada</Tag>
  return <Tag>{status}</Tag>
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
    width: 160,
    render: (v) => {
      if (!v) return '—'
      const cores = {
        'Contínua': 'green', 'Continua': 'green', 'Contínuo': 'green', 'Continuo': 'green',
        'Pontual': 'cyan', 'pontual': 'cyan',
        'Eventual': 'gold', 'Eventual (Sob Condição)': 'gold', 'Eventual (Sob Condicao)': 'gold',
        'Periódica - Mensal': 'blue', 'Periodica - Mensal': 'blue', 'Mensal': 'blue',
        'Periódica - Anual': 'volcano', 'Periodica - Anual': 'volcano', 'Anual': 'volcano',
        'Trimestral': 'geekblue',
        'Semestral': 'purple',
        'Única': 'default', 'Unica': 'default',
        'Encerramento da Concessão': 'magenta',
        'Encerramento daConcessão': 'magenta',
        'Encerramento da Concessao': 'magenta',
        'Periódica - Conforme Vigência': 'orange',
        'Periodica - Conforme Vigencia': 'orange',
        'Periódica - ConformeVigênci': 'orange',
        'Não definido': 'default',
      }
      const cor = cores[v] || 'default'
      return <Tag color={cor}>{v}</Tag>
    },
  },
  {
    title: 'Prazo',
    dataIndex: 'deadline',
    key: 'deadline',
    width: 120,
    render: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '—',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 130,
    render: (v, record) => {
      const isAwaitingCondition =
        (record.recurrence || '').toLowerCase().includes('eventual') &&
        record.condition_status !== 'cumprida'
      if (isAwaitingCondition) {
        return <Tag color="purple">Aguardando</Tag>
      }
      return <TagStatus status={v} />
    },
  },
]

function Obrigacoes({ onVerDetalhe, filtroInicial }) {
  const [dados, setDados] = useState([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState(filtroInicial || null)
  const [filtroRecorrencia, setFiltroRecorrencia] = useState(null)
  const [pagina, setPagina] = useState(1)
  const limite = 15
  const debounceRef = useRef(null)

  const carregar = async (paginaAtual = 1, q = busca, status = filtroStatus, recurrence = filtroRecorrencia) => {
    setCarregando(true)
    try {
      const params = {
        skip: (paginaAtual - 1) * limite,
        limit: limite,
      }
      if (q) params.q = q
      if (status && status !== 'all') params.status = status
      if (recurrence) params.recurrence = recurrence

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
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPagina(1)
      carregar(1, valor, filtroStatus, filtroRecorrencia)
    }, 400)
  }

  const onFiltrarStatus = (valor) => {
    setFiltroStatus(valor)
    setPagina(1)
    carregar(1, busca, valor, filtroRecorrencia)
  }

  const onFiltrarRecorrencia = (valor) => {
    setFiltroRecorrencia(valor || null)
    setPagina(1)
    carregar(1, busca, filtroStatus, valor || null)
  }

  const onMudarPagina = (novaPagina) => {
    setPagina(novaPagina)
    carregar(novaPagina, busca, filtroStatus, filtroRecorrencia)
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
          onChange={(e) => onBuscar(e.target.value)}
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
        <Select
          placeholder="Filtrar por recorrência"
          style={{ width: 240 }}
          allowClear
          onChange={onFiltrarRecorrencia}
          options={[
            { value: 'Contínua', label: 'Contínua' },
            { value: 'Pontual', label: 'Pontual' },
            { value: 'Eventual', label: 'Eventual' },
            { value: 'Periódica - Mensal', label: 'Periódica - Mensal' },
            { value: 'Periódica - Anual', label: 'Periódica - Anual' },

            { value: 'Encerramento da Concessão', label: 'Encerramento da Concessão' },
            { value: 'Periódica - Conforme Vigência', label: 'Periódica - Conforme Vigência' },
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
