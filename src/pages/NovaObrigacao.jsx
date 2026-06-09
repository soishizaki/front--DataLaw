import { useEffect, useState } from 'react'
import {
  Button, Card, Checkbox, Col, DatePicker, Form, Input, InputNumber, message,
  Row, Select, Switch, Typography
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { api } from '../services/api'

const { Title, Text } = Typography
const { TextArea } = Input

function NovaObrigacao() {
  const [form] = Form.useForm()
  const [contratos, setContratos] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [tipoGatilho, setTipoGatilho] = useState(null)
  const [emailAtivado, setEmailAtivado] = useState(false)
  const [recurrenceMode, setRecurrenceMode] = useState(null)

  useEffect(() => {
    api.contratos.listar().then(setContratos).catch(() => {
      message.error('Erro ao carregar contratos.')
    })
  }, [])

  const onSalvar = async (valores) => {
    setSalvando(true)
    try {
      const emails = (valores.emails || [])
        .filter(e => e?.ativo)
        .map(e => e?.email?.trim())
        .filter(Boolean)
      await api.obrigacoes.criar({
        contract_id: valores.contract_id,
        obligation_text: valores.obligation_text,
        document_name: valores.document_name || null,
        item_number: valores.item_number || null,
        responsible: valores.responsible || null,
        recurrence: valores.recurrence || null,
        deadline: valores.deadline ? valores.deadline.toISOString() : null,
        trigger_family: valores.trigger_family || null,
        trigger_type: valores.trigger_type || null,
        condition_raw: valores.condition_raw || null,
        email_enabled: valores.email_enabled || false,
        email_destino: valores.email_enabled && emails.length > 0 ? emails.join(',') : null,
        manual_reminder_at: valores.manual_reminder_at
          ? valores.manual_reminder_at.toISOString()
          : null,
        recurrence_mode: valores.recurrence_mode || null,
        recurrence_time: valores.recurrence_time || null,
        recurrence_interval_days: valores.recurrence_interval_days || null,
        recurrence_weekday: valores.recurrence_weekday ?? null,
        recurrence_day_of_month: valores.recurrence_day_of_month || null,
        recurrence_month: valores.recurrence_month || null,
        status: 'pending',
      })
      message.success('Obrigação criada com sucesso.')
      form.resetFields()
      setTipoGatilho(null)
      setEmailAtivado(false)
      setRecurrenceMode(null)
    } catch {
      message.error('Erro ao criar obrigação.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <Form form={form} layout="vertical" onFinish={onSalvar}>
        <Row gutter={24} align="stretch">

          {/* Coluna principal */}
          <Col span={16}>
            <Card title="Dados da Obrigação" style={{ marginBottom: 16 }}>
              <Form.Item label="Contrato" name="contract_id" rules={[{ required: true, message: 'Selecione o contrato' }]}>
                <Select
                  placeholder="Selecione o contrato"
                  showSearch
                  optionFilterProp="label"
                  options={contratos.map((c) => ({ value: c.id, label: c.name }))}
                />
              </Form.Item>

              <Form.Item label="Obrigação" name="obligation_text" rules={[{ required: true, message: 'Descreva a obrigação' }]}>
                <TextArea rows={5} placeholder="Descreva a obrigação conforme o contrato ou anexo..." />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Documento / Anexo" name="document_name">
                    <Input placeholder="Ex: Anexo III, Adendo 2..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Número do item" name="item_number">
                    <Input placeholder="Ex: 4.2.1" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Responsável" name="responsible">
                    <Input placeholder="Ex: Concessionária, ARTESP..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Prazo" name="deadline">
                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {tipoGatilho === 'eventual' && (
              <Card title="Condição de Ativação" style={{ marginBottom: 16 }}>
                <Form.Item label="Tipo do gatilho" name="trigger_type">
                  <Input placeholder="Ex: Aprovação regulatória, Conclusão de obra..." />
                </Form.Item>
                <Form.Item label="Condição" name="condition_raw" style={{ marginBottom: 0 }}>
                  <TextArea
                    rows={4}
                    placeholder="Descreva a condição que precisa ser cumprida para esta obrigação ser ativada..."
                  />
                </Form.Item>
              </Card>
            )}
          </Col>

          {/* Coluna lateral */}
          <Col span={8}>
            <Card title="Classificação" style={{ marginBottom: 16 }}>
              <Form.Item label="Recorrência" name="recurrence">
                <Select
                  placeholder="Selecione a recorrência"
                  allowClear
                  options={[
                    { value: 'Pontual', label: 'Pontual' },
                    { value: 'Contínuo', label: 'Contínuo' },
                    { value: 'Periódico', label: 'Periódico' },
                  ]}
                />
              </Form.Item>

              <Form.Item label="Tipo de obrigação" name="trigger_family" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="Selecione o tipo"
                  allowClear
                  onChange={setTipoGatilho}
                  options={[
                    { value: 'operacional', label: 'Operacional' },
                    { value: 'eventual', label: 'Eventual (condicional)' },
                  ]}
                />
              </Form.Item>
            </Card>

            <Card title="Lembrete por Email">
              <Form.Item label="Ativar lembrete" name="email_enabled" valuePropName="checked" style={{ marginBottom: emailAtivado ? 16 : 0 }}>
                <Switch onChange={setEmailAtivado} />
              </Form.Item>

              {emailAtivado && (
                <>
                  <Form.List name="emails" initialValue={[{ email: '', ativo: true }]}>
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
                              <Input
                                placeholder="advogado@escritorio.com"
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                          </div>
                        ))}
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
                    <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder="Data e hora do lembrete" />
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
                            { value: 0, label: 'Segunda' }, { value: 1, label: 'Terça' },
                            { value: 2, label: 'Quarta' }, { value: 3, label: 'Quinta' },
                            { value: 4, label: 'Sexta' }, { value: 5, label: 'Sábado' },
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
                            { value: 1, label: 'Jan' }, { value: 2, label: 'Fev' },
                            { value: 3, label: 'Mar' }, { value: 4, label: 'Abr' },
                            { value: 5, label: 'Mai' }, { value: 6, label: 'Jun' },
                            { value: 7, label: 'Jul' }, { value: 8, label: 'Ago' },
                            { value: 9, label: 'Set' }, { value: 10, label: 'Out' },
                            { value: 11, label: 'Nov' }, { value: 12, label: 'Dez' },
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
                </>
              )}
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 8 }}>
          <Button type="primary" htmlType="submit" loading={salvando} size="large">
            Criar obrigação
          </Button>
        </div>
      </Form>
    </div>
  )
}

export default NovaObrigacao
