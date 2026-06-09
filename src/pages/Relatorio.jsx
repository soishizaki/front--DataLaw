import { useEffect, useState } from 'react'
import { Button, Card, message, Space, Spin, Table, Tabs, Tag, Typography } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import { api } from '../services/api'

const { Title, Text } = Typography

const coresStatus = { pending: 'blue', completed: 'green', overdue: 'red' }
const labelStatus = { pending: 'Pendente', completed: 'Concluída', overdue: 'Atrasada' }

function Relatorio({ onVerDetalhe }) {
  const [obrigacoes, setObrigacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [concluindo, setConcluindo] = useState({})

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

        setObrigacoes(todas)
      } catch {
        message.error('Erro ao carregar obrigações.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const onConcluir = async (id, e) => {
    e.stopPropagation()
    setConcluindo(prev => ({ ...prev, [id]: true }))
    try {
      await api.obrigacoes.atualizar(id, { status: 'completed' })
      setObrigacoes(prev => prev.map(o => o.id === id ? { ...o, status: 'completed' } : o))
      message.success('Obrigação marcada como concluída.')
    } catch {
      message.error('Erro ao atualizar status.')
    } finally {
      setConcluindo(prev => ({ ...prev, [id]: false }))
    }
  }

  if (carregando) return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const em7Dias = new Date(hoje)
  em7Dias.setDate(hoje.getDate() + 7)

  const atrasadas = obrigacoes.filter(o => o.status === 'overdue')
  const urgentes = obrigacoes.filter(o => {
    if (o.status === 'completed' || o.status === 'overdue' || !o.deadline) return false
    const prazo = new Date(o.deadline)
    prazo.setHours(0, 0, 0, 0)
    return prazo <= em7Dias
  })

  const colunas = (lista) => [
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
      render: v => v ? new Date(v).toLocaleDateString('pt-BR') : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: v => <Tag color={coresStatus[v] || 'default'}>{labelStatus[v] || v}</Tag>,
    },
    {
      title: '',
      key: 'acao',
      width: 160,
      render: (_, record) =>
        record.status !== 'completed' ? (
          <Button
            size="small"
            icon={<CheckOutlined />}
            loading={!!concluindo[record.id]}
            onClick={(e) => onConcluir(record.id, e)}
          >
            Concluir
          </Button>
        ) : null,
    },
  ]

  const tabItems = [
    {
      key: 'atrasadas',
      label: (
        <Space>
          Atrasadas
          <Tag color="red">{atrasadas.length}</Tag>
        </Space>
      ),
      children: (
        <Table
          dataSource={atrasadas}
          columns={colunas(atrasadas)}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20, showTotal: t => `${t} obrigações` }}
          onRow={(record) => ({
            onClick: () => onVerDetalhe(record.id),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: 'Nenhuma obrigação atrasada.' }}
        />
      ),
    },
    {
      key: 'urgentes',
      label: (
        <Space>
          Vencem em 7 dias
          <Tag color="orange">{urgentes.length}</Tag>
        </Space>
      ),
      children: (
        <Table
          dataSource={urgentes}
          columns={colunas(urgentes)}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20, showTotal: t => `${t} obrigações` }}
          onRow={(record) => ({
            onClick: () => onVerDetalhe(record.id),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: 'Nenhuma obrigação vencendo em 7 dias.' }}
        />
      ),
    },
  ]

  return (
    <div>
      <Title level={5} style={{ marginBottom: 8 }}>Relatório de Urgências</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Clique em uma linha para ver o detalhe. Use o botão Concluir para atualização rápida de status.
      </Text>
      <Card>
        <Tabs items={tabItems} defaultActiveKey="atrasadas" />
      </Card>
    </div>
  )
}

export default Relatorio
