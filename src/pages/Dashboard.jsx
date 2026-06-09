import { useEffect, useState } from 'react'
import { Badge, Calendar, Card, Col, Row, Statistic, Table, Tag, Typography, Spin, message, Progress } from 'antd'
import {
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { api } from '../services/api'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function calcularResumo(obrigacoes) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const em7Dias = new Date(hoje); em7Dias.setDate(hoje.getDate() + 7)
  const em30Dias = new Date(hoje); em30Dias.setDate(hoje.getDate() + 30)

  let vencendo7 = 0, vencendo30 = 0, atrasadas = 0, concluidas = 0
  let condicoesPendentes = 0
  const porMes = {}

  for (let i = 0; i < 6; i++) {
    const d = new Date(hoje)
    d.setMonth(hoje.getMonth() + i)
    porMes[`${MESES[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`] = 0
  }

  const porData = {}

  for (const o of obrigacoes) {
    if (o.trigger_family === 'eventual' && o.condition_status !== 'cumprida') {
      condicoesPendentes++
    }

    if (o.status === 'completed') { concluidas++; continue }

    if (o.deadline) {
      const prazo = new Date(o.deadline)
      prazo.setHours(0, 0, 0, 0)
      const chaveData = prazo.toISOString().split('T')[0]
      if (!porData[chaveData]) porData[chaveData] = []
      porData[chaveData].push(o)

      if (prazo < hoje) atrasadas++
      else if (prazo <= em7Dias) vencendo7++
      else if (prazo <= em30Dias) vencendo30++

      const chaveMes = `${MESES[prazo.getMonth()]}/${prazo.getFullYear().toString().slice(2)}`
      if (chaveMes in porMes) porMes[chaveMes]++
    }
  }

  const total = obrigacoes.length
  const percentConcluidas = total > 0 ? Math.round((concluidas / total) * 100) : 0

  const dadosStatus = [
    { name: 'Pendentes', value: total - concluidas - atrasadas, color: '#1677ff' },
    { name: 'Concluídas', value: concluidas, color: '#52c41a' },
    { name: 'Atrasadas', value: atrasadas, color: '#ff4d4f' },
  ].filter(d => d.value > 0)

  const dadosMes = Object.entries(porMes).map(([name, value]) => ({ name, value }))

  const porRecorrencia = {}
  for (const o of obrigacoes) {
    if (o.status === 'completed') continue
    const tipo = o.recurrence || 'Não definido'
    porRecorrencia[tipo] = (porRecorrencia[tipo] || 0) + 1
  }
  const dadosRecorrencia = Object.entries(porRecorrencia)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const proximasObrigacoes = obrigacoes
    .filter(o => o.status !== 'completed' && o.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 8)

  return {
    vencendo7, vencendo30, atrasadas, concluidas, total,
    percentConcluidas, dadosStatus, dadosMes,
    condicoesPendentes, proximasObrigacoes, porData, dadosRecorrencia,
  }
}

const CORES_RECORRENCIA = {
  'Contínua': '#e35336',
  'Continua': '#e35336',
  'Pontual': '#cce241',
  'pontual': '#cce241',
  'Eventual (Sob Condição)': '#4de15c',
  'Eventual (Sob Condicao)': '#4de15c',
  'Eventual': '#4de15c',
  'Periódica - Mensal': '#58d6e0',
  'Periodica - Mensal': '#58d6e0',
  'Mensal': '#58d6e0',
  'Periódica - Anual': '#6863de',
  'Periodica - Anual': '#6863de',
  'Anual': '#6863de',
  'Encerramento da Concessão': '#dd6fdd',
  'Encerramento daConcessão': '#dd6fdd',
  'Encerramento da Concessao': '#dd6fdd',
  'Periódica - Conforme Vigência': '#dc7a7d',
  'Periodica - Conforme Vigencia': '#dc7a7d',
  'Periódica - ConformeVigênci': '#dc7a7d',
  'Trimestral': '#58d6e0',
  'Semestral': '#6863de',
  'Única': '#dc7a7d',
  'Unica': '#dc7a7d',
  'Não definido': '#DADADA',
}

const labelStatus = { pending: 'Pendente', completed: 'Concluída', overdue: 'Atrasada' }

function TagStatus({ status }) {
  if (status === 'pending')
    return <Tag style={{ backgroundColor: '#FFF3EE', borderColor: '#E8673A', color: '#E8673A' }}>Pendente</Tag>
  if (status === 'completed')
    return <Tag color="green">Concluída</Tag>
  if (status === 'overdue')
    return <Tag color="red">Atrasada</Tag>
  return <Tag>{status}</Tag>
}

const colunasProximas = [
  {
    title: 'Item',
    dataIndex: 'item_number',
    width: 70,
    render: v => v || '—',
  },
  {
    title: 'Obrigação',
    dataIndex: 'obligation_text',
    ellipsis: true,
  },
  {
    title: 'Responsável',
    dataIndex: 'responsible',
    width: 140,
    render: v => v || '—',
  },
  {
    title: 'Prazo',
    dataIndex: 'deadline',
    width: 110,
    render: v => new Date(v).toLocaleDateString('pt-BR'),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    width: 110,
    render: v => <TagStatus status={v} />,
  },
]

function Dashboard({ onNavegar }) {
  const [resumo, setResumo] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [cardHover, setCardHover] = useState(null)

  useEffect(() => {
    const carregar = async () => {
      try {
        const primeira = await api.obrigacoes.listar({ limit: 100, skip: 0 })
        const total = primeira.total
        const todas = [...primeira.items]

        if (total > 100) {
          const paginas = []
          for (let skip = 100; skip < total; skip += 100) {
            paginas.push(api.obrigacoes.listar({ limit: 100, skip }))
          }
          const resultados = await Promise.all(paginas)
          for (const r of resultados) todas.push(...r.items)
        }

        setResumo(calcularResumo(todas))
      } catch {
        message.error('Erro ao carregar dados do dashboard.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  if (carregando) return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />
  if (!resumo) return null

  const cards = [
    { titulo: 'Atrasadas', valor: resumo.atrasadas, icone: <WarningOutlined />, cor: '#ff4d4f', status: 'overdue' },
    { titulo: 'Vencem em 7 dias', valor: resumo.vencendo7, icone: <ExclamationCircleOutlined />, cor: '#fa541c', status: 'pending' },
    { titulo: 'Vencem em 30 dias', valor: resumo.vencendo30, icone: <ClockCircleOutlined />, cor: '#faad14', status: 'pending' },
    { titulo: 'Concluídas', valor: resumo.concluidas, icone: <CheckCircleOutlined />, cor: '#52c41a', status: 'completed' },
  ]

  const cellRender = (value) => {
    const chave = value.format('YYYY-MM-DD')
    const obrigacoesDia = resumo.porData[chave]
    if (!obrigacoesDia || obrigacoesDia.length === 0) return null
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {obrigacoesDia.slice(0, 2).map(o => (
          <li key={o.id}>
            <Badge
              status={o.status === 'overdue' ? 'error' : 'processing'}
              text={<span style={{ fontSize: 11 }}>{o.item_number || o.obligation_text.slice(0, 20)}</span>}
            />
          </li>
        ))}
        {obrigacoesDia.length > 2 && (
          <li><Text type="secondary" style={{ fontSize: 11 }}>+{obrigacoesDia.length - 2} mais</Text></li>
        )}
      </ul>
    )
  }

  return (
    <div>
      <Title level={5} style={{ marginBottom: 24 }}>Resumo das Obrigações</Title>

      <Row gutter={[16, 16]}>
        {cards.map((card) => (
          <Col span={5} key={card.titulo}>
            <Card
              onClick={() => onNavegar('obrigacoes', card.status)}
              onMouseEnter={() => setCardHover(card.titulo)}
              onMouseLeave={() => setCardHover(null)}
              style={{
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
                boxShadow: cardHover === card.titulo ? `0 0 0 2px ${card.cor}` : undefined,
              }}
            >
              <Statistic
                title={card.titulo}
                value={card.valor}
                prefix={<span style={{ color: card.cor }}>{card.icone}</span>}
                valueStyle={{ color: card.cor }}
                suffix={<Text type="secondary" style={{ fontSize: 13 }}> / {resumo.total}</Text>}
              />
            </Card>
          </Col>
        ))}
      </Row>

<Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="Calendário de vencimentos">
            <Calendar cellRender={cellRender} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="Próximas obrigações">
            <Table
              dataSource={resumo.proximasObrigacoes}
              columns={colunasProximas}
              rowKey="id"
              pagination={false}
              size="small"
              onRow={(record) => ({
                onClick: () => onNavegar('detalhe', record.id),
              })}
              rowClassName={() => 'linha-clicavel'}
            />
            <style>{`
              .linha-clicavel { cursor: pointer; }
              .linha-clicavel:hover > td { background-color: #FFF3EE !important; transition: background-color 0.15s; }
            `}</style>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="Visão geral">
            <Row align="middle" gutter={32}>
              <Col span={12} style={{ borderRight: '1px solid #f0f0f0', paddingRight: 32 }}>
                <div style={{ marginBottom: 24 }}>
                  <Text strong style={{ fontSize: 16 }}>Progresso geral</Text>
                  <Progress
                    percent={resumo.percentConcluidas}
                    strokeColor="#52c41a"
                    size={['100%', 16]}
                    style={{ marginTop: 12 }}
                  />
                  <Text type="secondary">{resumo.concluidas} de {resumo.total} obrigações concluídas</Text>
                </div>
                <Row gutter={16}>
                  {[
                    { label: 'Pendentes', value: resumo.total - resumo.concluidas - resumo.atrasadas, cor: '#1677ff' },
                    { label: 'Concluídas', value: resumo.concluidas, cor: '#52c41a' },
                    { label: 'Atrasadas', value: resumo.atrasadas, cor: '#ff4d4f' },
                  ].map(item => (
                    <Col span={8} key={item.label}>
                      <div style={{ textAlign: 'center', padding: '12px 0', background: '#fafafa', borderRadius: 8 }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: item.cor }}>{item.value}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Col>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>Distribuição por status</Text>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={resumo.dadosStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {resumo.dadosStatus.map(entry => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [v, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </Col>
            </Row>

            {resumo.dadosRecorrencia.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid #f0f0f0', margin: '24px 0' }} />
                <Text strong style={{ fontSize: 16 }}>Tipos de recorrência</Text>
                <ResponsiveContainer width="100%" height={Math.max(160, resumo.dadosRecorrencia.length * 44)} style={{ marginTop: 12 }}>
                  <BarChart
                    data={resumo.dadosRecorrencia}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [v, 'Obrigações']} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {resumo.dadosRecorrencia.map(entry => (
                        <Cell key={entry.name} fill={CORES_RECORRENCIA[entry.name] || '#8c8c8c'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </Card>
        </Col>
      </Row>

    </div>
  )
}

export default Dashboard
