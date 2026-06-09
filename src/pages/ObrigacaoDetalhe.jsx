import { useEffect, useState } from 'react'
import {
  Alert, Button, Card, Checkbox, Col, DatePicker, Descriptions, Form, Input, InputNumber,
  message, Modal, Row, Select, Space, Spin, Switch, Tag, Timeline, Typography
} from 'antd'
import { ArrowLeftOutlined, DeleteOutlined, MailOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../services/api'
import { lerEmails } from './Configuracoes'

const { Title, Text } = Typography
const { TextArea } = Input

const labelStatus = {
  pending: 'Pendente',
  completed: 'Concluída',
  overdue: 'Atrasada',
}

const corTimeline = { pending: '#E8673A', completed: 'green', overdue: 'red' }

function TagStatus({ status }) {
  if (status === 'pending')
    return <Tag style={{ backgroundColor: '#FFF3EE', borderColor: '#E8673A', color: '#E8673A' }}>Pendente</Tag>
  if (status === 'completed')
    return <Tag color="green">Concluída</Tag>
  if (status === 'overdue')
    return <Tag color="red">Atrasada</Tag>
  return <Tag>{status}</Tag>
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
  const [excluindo, setExcluindo] = useState(false)
  const [recurrenceMode, setRecurrenceMode] = useState(null)
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
      const emailsSalvos = o.email_destino
        ? o.email_destino.split(',').map(e => e.trim()).filter(Boolean)
        : []
      const emailsIniciais = emailsSalvos.length > 0 ? emailsSalvos : lerEmails()
      const emailsExistentes = emailsIniciais.length > 0
        ? emailsIniciais.map(e => ({ email: e, ativo: true }))
        : [{ email: '', ativo: true }]
      setRecurrenceMode(o.recurrence_mode || null)
      formEmail.setFieldsValue({
        email_enabled: o.email_enabled,
        emails: emailsExistentes,
        manual_reminder_at: o.manual_reminder_at ? dayjs(o.manual_reminder_at) : null,
        recurrence_mode: o.recurrence_mode || null,
        recurrence_interval_days: o.recurrence_interval_days || null,
        recurrence_weekday: o.recurrence_weekday ?? null,
        recurrence_day_of_month: o.recurrence_day_of_month || null,
        recurrence_month: o.recurrence_month || null,
        recurrence_time: o.recurrence_time || '08:00',
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
    const lista = (valores.emails || [])
      .filter(e => e?.ativo)
      .map(e => e?.email?.trim())
      .filter(Boolean)
    if (valores.email_enabled && lista.length === 0) {
      message.warning('Adicione pelo menos um email de destino.')
      return
    }
    setSalvandoEmail(true)
    try {
      const resultado = await api.obrigacoes.atualizar(id, {
        email_enabled: valores.email_enabled,
        email_destino: valores.email_enabled ? lista.join(',') : null,
        manual_reminder_at: valores.manual_reminder_at
          ? valores.manual_reminder_at.toISOString()
          : null,
        recurrence_mode: valores.recurrence_mode || '',
        recurrence_time: valores.recurrence_time || null,
        recurrence_interval_days: valores.recurrence_interval_days || null,
        recurrence_weekday: valores.recurrence_weekday ?? null,
        recurrence_day_of_month: valores.recurrence_day_of_month || null,
        recurrence_month: valores.recurrence_month || null,
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

  const onExcluir = () => {
    Modal.confirm({
      title: 'Excluir obrigação',
      content: 'Tem certeza que deseja excluir esta obrigação? Esta ação não pode ser desfeita.',
      okText: 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        setExcluindo(true)
        try {
          await api.obrigacoes.deletar(id)
          message.success('Obrigação excluída.')
          onVoltar()
        } catch {
          message.error('Erro ao excluir obrigação.')
        } finally {
          setExcluindo(false)
        }
      },
    })
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
  const isContinua = dados.recurrence === 'Contínuo'
  const conditionPending = isEventual && dados.condition_status !== 'cumprida'
  const _rawCondition = dados.condition_raw || dados.depends_on_clauses || ''
  const conditionText = _rawCondition === '—' || _rawCondition === '—' ? null : _rawCondition || null

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={onVoltar}>
          Voltar
        </Button>
        {dados.email_enabled && !isContinua && (
          <Button
            icon={<MailOutlined />}
            onClick={onEnviarEmail}
            loading={enviandoEmail}
          >
            Enviar lembrete agora
          </Button>
        )}
        <Button
          icon={<DeleteOutlined />}
          danger
          loading={excluindo}
          onClick={onExcluir}
        >
          Excluir
        </Button>
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
                <TagStatus status={dados.status} />
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
                  <Descriptions.Item label="Condição de Ativação" span={2}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text>{conditionText || '—'}</Text>
                      <Space>
                        <Tag color={dados.condition_status === 'cumprida' ? 'green' : 'volcano'}>
                          {dados.condition_status === 'cumprida' ? 'Evento ocorrido' : 'Aguardando evento'}
                        </Tag>
                        {dados.condition_status !== 'cumprida' ? (
                          <Button
                            size="small"
                            type="primary"
                            loading={marcandoCondicao}
                            onClick={() => onMarcarCondicao('cumprida')}
                          >
                            Confirmar que o evento ocorreu
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
                    </Space>
                  </Descriptions.Item>
                  {dados.deadline_text && (
                    <Descriptions.Item label="Prazo após ativação" span={2}>
                      {dados.deadline_text}
                    </Descriptions.Item>
                  )}
                  {dados.is_input_for_clauses && dados.is_input_for_clauses !== '—' && (
                    <Descriptions.Item label="Alimenta" span={2}>
                      <Text type="secondary">{dados.is_input_for_clauses}</Text>
                    </Descriptions.Item>
                  )}
                </>
              )}

              {dados.next_recurrence_at && (
                <Descriptions.Item label="Próx. recorrência" span={1}>
                  {new Date(dados.next_recurrence_at).toLocaleString('pt-BR')}
                </Descriptions.Item>
              )}
              {dados.next_reminder_at && (
                <Descriptions.Item label="Próx. lembrete" span={1}>
                  {new Date(dados.next_reminder_at).toLocaleString('pt-BR')}
                </Descriptions.Item>
              )}
              {dados.last_email_sent_at && (
                <Descriptions.Item label="Último envio" span={1}>
                  {new Date(dados.last_email_sent_at).toLocaleString('pt-BR')}
                </Descriptions.Item>
              )}
              {dados.status_envio && (
                <Descriptions.Item label="Status envio" span={1}>
                  {dados.status_envio}
                </Descriptions.Item>
              )}
              {dados.observations && (
                <Descriptions.Item label="Observações" span={2}>
                  {dados.observations}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {isContinua ? (
            <Card style={{ marginBottom: 16 }}>
              <Title level={5} style={{ marginBottom: 8 }}>Lembrete mensal</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                O escritório será notificado todo dia 1 do mês sobre as obrigações contínuas ativas.
              </Text>
              <Space>
                <Switch
                  checked={emailAtivado}
                  loading={salvandoEmail}
                  onChange={async (checked) => {
                    setSalvandoEmail(true)
                    try {
                      setEmailAtivado(checked)
                      await api.obrigacoes.atualizar(id, { email_enabled: checked })
                      message.success(checked ? 'Lembrete ativado.' : 'Lembrete desativado.')
                    } catch {
                      setEmailAtivado(!checked)
                      message.error('Erro ao salvar.')
                    } finally {
                      setSalvandoEmail(false)
                    }
                  }}
                />
                <Text>{emailAtivado ? 'Incluída no lembrete mensal' : 'Não incluída no lembrete mensal'}</Text>
              </Space>
            </Card>
          ) : (
            <Card style={{ marginBottom: 16 }}>
              <Title level={5} style={{ marginBottom: 16 }}>Lembrete por Email</Title>
              <Form form={formEmail} layout="vertical" onFinish={onSalvarEmail}>
                <Form.Item label="Ativar lembrete" name="email_enabled" valuePropName="checked">
                  <Switch onChange={setEmailAtivado} />
                </Form.Item>

                {emailAtivado && (
                  <>
                    <Form.List name="emails">
                      {(fields, { add }) => (
                        <>
                          {fields.map((field) => (
                            <div
                              key={field.key}
                              style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}
                            >
                              <Form.Item
                                {...field}
                                name={[field.name, 'ativo']}
                                valuePropName="checked"
                                noStyle
                              >
                                <Checkbox />
                              </Form.Item>
                              <Form.Item
                                {...field}
                                name={[field.name, 'email']}
                                noStyle
                                rules={[
                                  { required: true, message: 'Informe o email' },
                                  { type: 'email', message: 'Email inválido' },
                                ]}
                                style={{ flex: 1 }}
                              >
                                <Input placeholder="advogado@escritorio.com" style={{ width: '100%' }} />
                              </Form.Item>
                            </div>
                          ))}
                          {fields.length === 0 && (
                            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                              Nenhum destinatário adicionado.
                            </Typography.Text>
                          )}
                          <Button
                            type="dashed"
                            onClick={() => add({ email: '', ativo: true })}
                            icon={<PlusOutlined />}
                            style={{ width: '100%', marginBottom: 16 }}
                          >
                            Adicionar destinatário
                          </Button>
                        </>
                      )}
                    </Form.List>

                    <Form.Item label="Lembrete único" name="manual_reminder_at">
                      <DatePicker
                        showTime
                        format="DD/MM/YYYY HH:mm"
                        style={{ width: '100%' }}
                        placeholder="Data e hora do lembrete"
                      />
                    </Form.Item>

                    <Form.Item label="Recorrência" name="recurrence_mode">
                      <Select
                        placeholder="Sem recorrência"
                        allowClear
                        onChange={(v) => setRecurrenceMode(v || null)}
                        options={[
                          { value: 'manual_days', label: 'A cada X dias' },
                          { value: 'weekly', label: 'Semanal' },
                          { value: 'monthly', label: 'Mensal' },
                          { value: 'yearly', label: 'Anual' },
                        ]}
                      />
                    </Form.Item>

                    {recurrenceMode === 'manual_days' && (
                      <Row gutter={8}>
                        <Col span={12}>
                          <Form.Item label="Intervalo (dias)" name="recurrence_interval_days">
                            <InputNumber min={1} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Horário" name="recurrence_time">
                            <Input placeholder="08:00" />
                          </Form.Item>
                        </Col>
                      </Row>
                    )}

                    {recurrenceMode === 'weekly' && (
                      <Row gutter={8}>
                        <Col span={12}>
                          <Form.Item label="Dia da semana" name="recurrence_weekday">
                            <Select options={[
                              { value: 0, label: 'Segunda' },
                              { value: 1, label: 'Terça' },
                              { value: 2, label: 'Quarta' },
                              { value: 3, label: 'Quinta' },
                              { value: 4, label: 'Sexta' },
                              { value: 5, label: 'Sábado' },
                              { value: 6, label: 'Domingo' },
                            ]} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Horário" name="recurrence_time">
                            <Input placeholder="08:00" />
                          </Form.Item>
                        </Col>
                      </Row>
                    )}

                    {recurrenceMode === 'monthly' && (
                      <Row gutter={8}>
                        <Col span={12}>
                          <Form.Item label="Dia do mês" name="recurrence_day_of_month">
                            <InputNumber min={1} max={31} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Horário" name="recurrence_time">
                            <Input placeholder="08:00" />
                          </Form.Item>
                        </Col>
                      </Row>
                    )}

                    {recurrenceMode === 'yearly' && (
                      <Row gutter={8}>
                        <Col span={8}>
                          <Form.Item label="Mês" name="recurrence_month">
                            <Select options={[
                              { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
                              { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
                              { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
                              { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
                              { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
                              { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
                            ]} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item label="Dia" name="recurrence_day_of_month">
                            <InputNumber min={1} max={31} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item label="Horário" name="recurrence_time">
                            <Input placeholder="08:00" />
                          </Form.Item>
                        </Col>
                      </Row>
                    )}

                    {dados.next_reminder_at && (
                      <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                        Próximo lembrete: {new Date(dados.next_reminder_at).toLocaleString('pt-BR')}
                      </Text>
                    )}
                    {dados.last_email_sent_at && (
                      <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 16 }}>
                        Último envio: {new Date(dados.last_email_sent_at).toLocaleString('pt-BR')}
                      </Text>
                    )}
                  </>
                )}

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" loading={salvandoEmail}>
                    Salvar configuração
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          )}

          <Card>
            <Title level={5} style={{ marginBottom: 16 }}>Atualizar Status</Title>
            {conditionPending && (
              <Alert
                type="warning"
                showIcon
                message="Aguardando condição de ativação"
                description="Esta obrigação só pode ser concluída após confirmar que o evento de ativação ocorreu."
                style={{ marginBottom: 16 }}
              />
            )}
            <Form form={formStatus} layout="vertical" onFinish={onSalvarStatus}>
              <Form.Item label="Novo status" name="status" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'pending', label: 'Pendente' },
                    { value: 'completed', label: 'Concluída', disabled: conditionPending },
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
                  color: corTimeline[h.new_status] || 'gray',
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
