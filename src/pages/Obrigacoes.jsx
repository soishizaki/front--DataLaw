import { useEffect, useRef, useState } from 'react'
import { Table, Tag, Input, Select, Space, Typography, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { api } from '../services/api'
import { getLabelDocumento } from '../utils/anexosNomes'

const { Title } = Typography

const labelStatus = {
  pending: 'Pendente',
  completed: 'Concluída',
  overdue: 'Atrasada',
}

function normalizarFase(fase) {
  if (!fase) return null
  const idx = fase.indexOf('(Adicionado por IA:')
  let clean = (idx > 0 ? fase.slice(0, idx) : fase).trim()
  if (clean.startsWith('* ')) clean = clean.slice(2)
  return clean
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
    title: 'Fase',
    dataIndex: 'contract_phase',
    key: 'contract_phase',
    width: 130,
    render: (v) => normalizarFase(v) || '—',
  },
  {
    title: 'Recorrência',
    dataIndex: 'recurrence',
    key: 'recurrence',
    width: 190,
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
    dataIndex: 'deadline_text',
    key: 'deadline_text',
    width: 150,
    render: (v, record) => {
      const isPeriodica = (record.recurrence || '').startsWith('Periódica')
      const isEncerramento = record.recurrence === 'Encerramento da Concessão'
      if (isPeriodica && record.next_recurrence_at) {
        const d = new Date(record.next_recurrence_at)
        return `Próximo: ${d.toLocaleDateString('pt-BR')}`
      }
      if (isEncerramento && record.deadline) {
        const d = new Date(record.deadline)
        return d.toLocaleDateString('pt-BR')
      }
      return v || '—'
    },
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 230,
    render: (v, record) => {
      const isEventualRecord = (record.recurrence || '').toLowerCase().includes('eventual')
      const aguardandoCumprimento = isEventualRecord && record.has_dependency && record.status !== 'completed'
      const aguardandoEvento = isEventualRecord && !record.has_dependency && record.status !== 'completed'
      if (aguardandoCumprimento) return <Tag color="purple">Aguardando cumprimento de obrigação</Tag>
      if (aguardandoEvento) return <Tag color="gold">Aguardando evento externo</Tag>
      return <TagStatus status={v} />
    },
  },
]

const DOCUMENTOS_FILTRO = [
  { value: 'Contrato', label: 'Contrato' },
  { value: 'Anexo 1 - Regulamento da Concessão', label: 'Anexo 1' },
  { value: 'Anexo 2 - Plano de Exploração Aeroportuária (PEA)', label: 'Anexo 2' },
  { value: 'Anexo 3', label: 'Anexo 3' },
  { value: 'Anexo 4 - Plano de Transferência Operacional (PTO)', label: 'Anexo 4' },
  { value: 'Anexo 5 - Tarifas Aeroportuárias', label: 'Anexo 5' },
  { value: 'Anexo 6 - Contrato de Administração de Contas', label: 'Anexo 6' },
  { value: 'Anexo 7', label: 'Anexo 7' },
  { value: 'Anexo 8 - Termo de Aceitação e Permissão de Uso de Ativos', label: 'Anexo 8' },
  { value: 'Anexo 9', label: 'Anexo 9' },
  { value: 'Anexo 10', label: 'Anexo 10' },
  { value: 'Anexo 11', label: 'Anexo 11' },
  { value: 'Anexo 12', label: 'Anexo 12' },
  { value: 'Anexo 13', label: 'Anexo 13' },
  { value: 'Anexo 14', label: 'Anexo 14' },
  { value: 'Anexo 15', label: 'Anexo 15' },
  { value: 'Anexo 16', label: 'Anexo 16' },
  { value: 'Anexo 17 - Caderno de Penalidades', label: 'Anexo 17' },
  { value: 'Anexo 18', label: 'Anexo 18' },
  { value: 'Edital', label: 'Edital' },
]

function Obrigacoes({ onVerDetalhe, filtros = {}, onFiltrosChange }) {
  const [dados, setDados] = useState([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState(filtros.busca || '')
  const [filtroStatus, setFiltroStatus] = useState(filtros.status || null)
  const [filtroRecorrencia, setFiltroRecorrencia] = useState(filtros.recorrencia || null)
  const [filtroFase, setFiltroFase] = useState(filtros.fase || null)
  const [filtroDocumento, setFiltroDocumento] = useState(filtros.documento || null)
  const [pagina, setPagina] = useState(filtros.pagina || 1)
  const limite = 15
  const debounceRef = useRef(null)

  const carregar = async (paginaAtual = 1, q = busca, status = filtroStatus, recurrence = filtroRecorrencia, fase = filtroFase, documento = filtroDocumento) => {
    setCarregando(true)
    try {
      const params = {
        skip: (paginaAtual - 1) * limite,
        limit: limite,
      }
      if (q) params.q = q
      if (status && status !== 'all') params.status = status
      if (recurrence) params.recurrence = recurrence
      if (fase) params.contract_phase = fase
      if (documento) params.document_name = documento

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
    carregar(filtros.pagina || 1, filtros.busca || '', filtros.status || null, filtros.recorrencia || null, filtros.fase || null, filtros.documento || null)
  }, [])

  const onBuscar = (valor) => {
    setBusca(valor)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPagina(1)
      carregar(1, valor, filtroStatus, filtroRecorrencia, filtroFase, filtroDocumento)
      onFiltrosChange?.({ busca: valor, status: filtroStatus, recorrencia: filtroRecorrencia, fase: filtroFase, documento: filtroDocumento, pagina: 1 })
    }, 400)
  }

  const onFiltrarStatus = (valor) => {
    const v = valor ?? null
    setFiltroStatus(v)
    setPagina(1)
    carregar(1, busca, v, filtroRecorrencia, filtroFase, filtroDocumento)
    onFiltrosChange?.({ busca, status: v, recorrencia: filtroRecorrencia, fase: filtroFase, documento: filtroDocumento, pagina: 1 })
  }

  const onFiltrarRecorrencia = (valor) => {
    const v = valor || null
    setFiltroRecorrencia(v)
    setPagina(1)
    carregar(1, busca, filtroStatus, v, filtroFase, filtroDocumento)
    onFiltrosChange?.({ busca, status: filtroStatus, recorrencia: v, fase: filtroFase, documento: filtroDocumento, pagina: 1 })
  }

  const onFiltrarFase = (valor) => {
    const v = valor || null
    setFiltroFase(v)
    setPagina(1)
    carregar(1, busca, filtroStatus, filtroRecorrencia, v, filtroDocumento)
    onFiltrosChange?.({ busca, status: filtroStatus, recorrencia: filtroRecorrencia, fase: v, documento: filtroDocumento, pagina: 1 })
  }

  const onFiltrarDocumento = (valor) => {
    const v = valor || null
    setFiltroDocumento(v)
    setPagina(1)
    carregar(1, busca, filtroStatus, filtroRecorrencia, filtroFase, v)
    onFiltrosChange?.({ busca, status: filtroStatus, recorrencia: filtroRecorrencia, fase: filtroFase, documento: v, pagina: 1 })
  }

  const onMudarPagina = (novaPagina) => {
    setPagina(novaPagina)
    carregar(novaPagina, busca, filtroStatus, filtroRecorrencia, filtroFase, filtroDocumento)
    onFiltrosChange?.({ busca, status: filtroStatus, recorrencia: filtroRecorrencia, fase: filtroFase, documento: filtroDocumento, pagina: novaPagina })
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
          value={busca}
          onChange={(e) => onBuscar(e.target.value)}
        />
        <Select
          placeholder="Filtrar por status"
          style={{ width: 180 }}
          allowClear
          value={filtroStatus || undefined}
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
          value={filtroRecorrencia}
          onChange={onFiltrarRecorrencia}
          options={[
            { value: 'Contínua', label: 'Contínua' },
            { value: 'Pontual', label: 'Pontual' },
            { value: 'Eventual (Sob Condição)', label: 'Eventual (Sob Condição)' },
            { value: 'Periódica - Mensal', label: 'Periódica - Mensal' },
            { value: 'Periódica - Anual', label: 'Periódica - Anual' },
            { value: 'Periódica - Conforme Vigência', label: 'Periódica - Conforme Vigência' },
            { value: 'Encerramento da Concessão', label: 'Encerramento da Concessão' },
          ]}
        />
        <Select
          placeholder="Filtrar por fase"
          style={{ width: 180 }}
          allowClear
          value={filtroFase}
          onChange={onFiltrarFase}
          options={[
            { value: 'Fase I-A', label: 'Fase I-A' },
            { value: 'Fase I-B', label: 'Fase I-B' },
            { value: 'Fase II', label: 'Fase II' },
            { value: 'Encerramento', label: 'Encerramento' },
            { value: 'Todas as fases', label: 'Todas as fases' },
          ]}
        />
        <Select
          placeholder="Filtrar por documento"
          style={{ width: 180 }}
          allowClear
          showSearch
          optionFilterProp="label"
          value={filtroDocumento}
          onChange={onFiltrarDocumento}
          options={DOCUMENTOS_FILTRO.map(d => ({ ...d, label: getLabelDocumento(d.value) }))}
        />
      </Space>

      <Table
        dataSource={dados}
        columns={colunas}
        rowKey="id"
        loading={carregando}
        scroll={{ x: 850 }}
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
