import { useEffect, useState } from 'react'
import {
  Alert, Button, Card, Col, DatePicker, Descriptions, Form, Input,
  message, Row, Select, Space, Spin, Switch, Tag, Timeline, Typography
} from 'antd'
import { ArrowLeftOutlined, MailOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../services/api'
import { CHAVE_EMAIL } from './Configuracoes'

const { Title, Text } = Typography
const { TextArea } = Input

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

function ObrigacaoDetalhe({ id, onVoltar }) {
  const [dados, setDados] = useState(null)
  const [historico, setHistorico] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvandoEmail, setSalvandoEmail] = useState(false)
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [emailAtivado, setEmailAtivado] = useState(false)
  const [marcandoCondicao, setMarcandoCondicao] = useState(false)
  const [formStatus] = Form.useForm()
  const [formEmail] = Form.useForm()

  const carregar = async () => {
    setCarregando(true)
    try {
      const resultado = await api.obrigacoes.buscarPorId(id)
      const o = resultado.obligation
      setDados(o)
      setHistorico(resultado.history)
      setEmailAtivado(o.email_enabled)
      formStatus.setFieldsValue({ status: o.status })
      formEmail.setFieldsValue({
        email_enabled: o.email_enabled,
        email_destino: o.email_destino || '',
        data_envio_email: o.data_envio_email ? dayjs(o.data_envio_email) : null,
      })
    } catch {
      message.error('Erro ao carregar obrigação.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [id])

  const onSalvarStatus = async (valores) => {
    setSalvando(true)
    try {
      const resultado = await api.obrigacoes.atualizar(id, {
        status: valores.status,
        note: valores.note || null,
      })
      setDados(resultado.obligation)
      setHistorico(resultado.history)
      formStatus.setFieldsValue({ note: '' })
      message.success('Status atualizado com sucesso.')
    } catch {
      message.error('Erro ao atualizar status.')
    } finally {
      setSalvando(false)
    }
  }

  const onSalvarEmail = async (valores) => {
    const emailGlobal = localStorage.getItem(CHAVE_EMAIL)
    if (valores.email_enabled && !emailGlobal) {
      message.warning('Configure o email de destino em Configurações primeiro.')
      return
    }
    setSalvandoEmail(true)
    try {
      const resultado = await api.obrigacoes.atualizar(id, {
        email_enabled: valores.email_enabled,
        email_destino: valores.email_enabled ? emailGlobal : null,
        data_envio_email: valores.data_envio_email
          ? valores.data_envio_email.toISOString()
          : null,
      })
      setDados(resultado.obligation)
      message.success('Configuração de email salva.')
    } catch {
      message.error('Erro ao salvar configuração de email.')
    } finally {
      setSalvandoEmail(false)
    }
  }

  const onMarcarCondicao = async (novoStatus) => {
    setMarcandoCondicao(true)
    try {
      const resultado = await api.obrigacoes.atualizar(id, { condition_status: novoStatus })
      setDados(resultado.obligation)
      message.success(novoStatus === 'cumprida' ? 'Condição marcada como cumprida.' : 'Condição reaberta.')
    } catch {
      message.error('Erro ao atualizar condição.')
    } finally {
      setMarcandoCondicao(false)
    }
  }

  const onEnviarEmail = async () => {
    setEnviandoEmail(true)
    try {
      await api.obrigacoes.enviarEmail(id)
      message.success('Email enviado com sucesso.')
    } catch {
      message.error('Erro ao enviar email.')
    } finally {
      setEnviandoEmail(false)
    }
  }

  if (carregando) {
    return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />
  }

  if (!dados) return null

  const isEventual = dados.trigger_family === 'eventual' ||
    (dados.recurrence && dados.recurrence.toLowerCase().includes('eventual'))

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onVoltar}>
          Voltar
        </Button>
        {dados.email_enabled && (
          <Button
            icon={<MailOutlined />}
            onClick={onEnviarEmail}
            loading={enviandoEmail}
          >
            Enviar lembrete agora
          </Button>
        )}
      </Space>

      <Row gutter={16}>
        <Col span={16}>
          <Card style={{ marginBottom: 16 }}>
            <Title level={5} style={{ marginBottom: 16 }}>Dados da Obrigação</Title>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Item" span={1}>
                {dados.item_number || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Status" span={1}>
                <Tag color={coresStatus[dados.status] || 'default'}>
                  {labelStatus[dados.status] || dados.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Documento" span={2}>
                {dados.document_name || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Obrigação" span={2}>
                {dados.obligation_text}
              </Descriptions.Item>
              <Descriptions.Item label="Responsável" span={1}>
                {dados.responsible || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Recorrência" span={1}>
                {dados.recurrence || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Prazo" span={1}>
                {dados.deadline
                  ? new Date(dados.deadline).toLocaleDateString('pt-BR')
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Tipo" span={1}>
                {isEventual ? (
                  <Tag color="purple">Eventual</Tag>
                ) : dados.trigger_family ? (
                  <Tag color="cyan">{dados.trigger_family.charAt(0).toUpperCase() + dados.trigger_family.slice(1)}</Tag>
                ) : '—'}
              </Descriptions.Item>

              {isEventual && (
                <>
                  <Descriptions.Item label="Condição" span={2}>
                    {dados.condition_raw || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status da condição" span={2}>
                    <Space>
                      <Tag color={dados.condition_status === 'cumprida' ? 'green' : 'orange'}>
                        {dados.condition_status === 'cumprida' ? 'Cumprida' : 'Pendente'}
                      </Tag>
                      {dados.condition_status !== 'cumprida' ? (
                        <Button
                          size="small"
                          type="primary"
                          loading={marcandoCondicao}
                          onClick={() => onMarcarCondicao('cumprida')}
                        >
                          Marcar como cumprida
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          loading={marcandoCondicao}
                          onClick={() => onMarcarCondicao('pendente')}
                        >
                          Reabrir condição
                        </Button>
                      )}
                    </Space>
                  </Descriptions.Item>
                </>
              )}

              {dados.observations && (
                <Descriptions.Item label="Observações" span={2}>
                  {dados.observations}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <Title level={5} style={{ marginBottom: 16 }}>Lembrete por Email</Title>
            {!localStorage.getItem(CHAVE_EMAIL) && (
              <Alert
                type="warning"
                message="Email de destino não configurado"
                description="Defina o email global em Configurações antes de ativar lembretes."
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            <Form form={formEmail} layout="vertical" onFinish={onSalvarEmail}>
              <Form.Item label="Ativar lembrete" name="email_enabled" valuePropName="checked">
                <Switch onChange={setEmailAtivado} />
              </Form.Item>

              {emailAtivado && (
                <>
                  <Form.Item label="Enviar para">
                    <Input
                      value={localStorage.getItem(CHAVE_EMAIL) || '—'}
                      disabled
                      suffix={<Text type="secondary" style={{ fontSize: 12 }}>definido em Configurações</Text>}
                    />
                  </Form.Item>
                  <Form.Item label="Data e hora de envio" name="data_envio_email">
                    <DatePicker
                      showTime
                      format="DD/MM/YYYY HH:mm"
                      style={{ width: '100%' }}
                      placeholder="Quando o lembrete deve ser enviado"
                    />
                  </Form.Item>
                </>
              )}

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={salvandoEmail}>
                  Salvar configuração
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Card>
            <Title level={5} style={{ marginBottom: 16 }}>Atualizar Status</Title>
            <Form form={formStatus} layout="vertical" onFinish={onSalvarStatus}>
              <Form.Item label="Novo status" name="status" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'pending', label: 'Pendente' },
                    { value: 'completed', label: 'Concluída' },
                    { value: 'overdue', label: 'Atrasada' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="Observação (opcional)" name="note">
                <TextArea rows={3} placeholder="Descreva o que foi feito ou o motivo da mudança..." />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={salvando}>
                  Salvar
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          <Card>
            <Title level={5} style={{ marginBottom: 16 }}>Histórico</Title>
            {historico.length === 0 ? (
              <Text type="secondary">Nenhuma alteração registrada.</Text>
            ) : (
              <Timeline
                items={historico.map((h) => ({
                  color: coresStatus[h.new_status] || 'gray',
                  children: (
                    <div>
                      <Text strong>{labelStatus[h.new_status] || h.new_status}</Text>
                      {h.old_status && (
                        <Text type="secondary"> (era: {labelStatus[h.old_status] || h.old_status})</Text>
                      )}
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(h.changed_at).toLocaleString('pt-BR')}
                      </Text>
                      {h.note && (
                        <>
                          <br />
                          <Text style={{ fontSize: 13 }}>{h.note}</Text>
                        </>
                      )}
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ObrigacaoDetalhe
