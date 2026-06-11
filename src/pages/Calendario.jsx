import { useEffect, useState } from 'react'
import { Badge, Button, Calendar, Card, Drawer, List, Space, Spin, Tag, Typography, message } from 'antd'
import dayjs from 'dayjs'
import { api } from '../services/api'

const { Text } = Typography

const STATUS_COR = { pending: 'orange', completed: 'green', overdue: 'red' }
const STATUS_LABEL = { pending: 'Pendente', completed: 'Concluída', overdue: 'Atrasada' }

function dataEfetiva(o) {
  const rec = o.recurrence || ''
  if (rec.startsWith('Periódica') && o.next_recurrence_at) return o.next_recurrence_at
  return o.deadline || null
}

const isContinua = (o) => (o.recurrence || '').toLowerCase().startsWith('contín')

function Calendario({ onVerDetalhe }) {
  const [porData, setPorData] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [drawerAberto, setDrawerAberto] = useState(false)
  const [drawerTitulo, setDrawerTitulo] = useState('')
  const [obrigacoesDia, setObrigacoesDia] = useState([])

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      try {
        const first = await api.obrigacoes.listar({ limit: 100, skip: 0 })
        let todas = first.items || []
        const total = first.total || 0
        for (let skip = 100; skip < total; skip += 100) {
          const page = await api.obrigacoes.listar({ limit: 100, skip })
          todas = todas.concat(page.items || [])
        }
        const mapa = {}
        for (const o of todas) {
          if (o.status === 'completed' || isContinua(o)) continue
          const d = dataEfetiva(o)
          if (!d) continue
          const chave = new Date(d).toISOString().split('T')[0]
          if (!mapa[chave]) mapa[chave] = []
          mapa[chave].push(o)
        }
        setPorData(mapa)
      } catch (err) {
        message.error(err?.message || 'Erro ao carregar obrigações.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const cellRender = (value) => {
    const chave = value.format('YYYY-MM-DD')
    const obs = porData[chave]
    if (!obs || obs.length === 0) return null
    const temAtrasadas = obs.some(o => o.status === 'overdue')
    return (
      <>
        <span className={`has-obs${temAtrasadas ? ' has-overdue' : ''}`} style={{ display: 'none' }} />
        <ul style={{ listStyle: 'none', padding: 0, margin: '2px 0 0' }}>
          {obs.slice(0, 3).map(o => (
            <li key={o.id} style={{ marginBottom: 2 }}>
              <Badge
                status={o.status === 'overdue' ? 'error' : 'processing'}
                text={<span style={{ fontSize: 13 }}>{o.item_number || o.obligation_text?.slice(0, 22)}</span>}
              />
            </li>
          ))}
          {obs.length > 3 && (
            <li><Text type="secondary" style={{ fontSize: 12 }}>+{obs.length - 3} mais</Text></li>
          )}
        </ul>
      </>
    )
  }

  if (carregando) return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />

  return (
    <>
      <style>{`
        .ant-picker-cell:has(.has-obs) .ant-picker-cell-inner {
          background: #e6f4ff !important;
          border-radius: 6px;
        }
        .ant-picker-cell:has(.has-overdue) .ant-picker-cell-inner {
          background: #fff1f0 !important;
        }
        .ant-picker-cell:has(.has-obs):hover .ant-picker-cell-inner {
          background: #bae0ff !important;
        }
        .ant-picker-cell:has(.has-overdue):hover .ant-picker-cell-inner {
          background: #ffccc7 !important;
        }
        .ant-picker-cell:has(.has-obs) { cursor: pointer; }
      `}</style>

      <Card title="Calendário de vencimentos">
        <Calendar
          cellRender={cellRender}
          validRange={[dayjs('2022-01-01'), dayjs('2052-12-31')]}
          onSelect={(date, { source }) => {
            if (source !== 'date') return
            const chave = date.format('YYYY-MM-DD')
            const obs = porData[chave]
            if (obs && obs.length > 0) {
              setDrawerTitulo(date.format('DD/MM/YYYY'))
              setObrigacoesDia(obs)
              setDrawerAberto(true)
            }
          }}
        />
      </Card>

      <Drawer
        title={`Obrigações — ${drawerTitulo}`}
        open={drawerAberto}
        onClose={() => setDrawerAberto(false)}
        width={500}
      >
        <List
          dataSource={obrigacoesDia}
          renderItem={o => (
            <List.Item
              extra={
                <Button
                  size="small"
                  onClick={() => { setDrawerAberto(false); onVerDetalhe?.(o.id) }}
                >
                  Ver detalhe
                </Button>
              }
            >
              <List.Item.Meta
                title={
                  <Space wrap>
                    {o.item_number && <Text strong>{o.item_number}</Text>}
                    <Tag color={STATUS_COR[o.status] || 'default'}>
                      {STATUS_LABEL[o.status] || o.status}
                    </Tag>
                    {o.recurrence && <Tag>{o.recurrence}</Tag>}
                  </Space>
                }
                description={o.obligation_text}
              />
            </List.Item>
          )}
        />
      </Drawer>
    </>
  )
}

export default Calendario
