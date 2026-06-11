import { useEffect, useState } from 'react'
import {
  Button, Card, Checkbox, Col, DatePicker, Form, Input, InputNumber, message,
  Row, Select, Space, Switch, TimePicker, Typography
} from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { api } from '../services/api'
import { getLabelDocumento } from '../utils/anexosNomes'

const { TextArea } = Input
const { Text, Title } = Typography

const DOCUMENTOS = [
  { value: 'Contrato', label: 'Contrato' },
  { value: 'Anexo 1 - Regulamento da Concessão', label: 'Anexo 1 - Regulamento da Concessão' },
  { value: 'Anexo 2 - Plano de Exploração Aeroportuária (PEA)', label: 'Anexo 2 - Plano de Exploração Aeroportuária (PEA)' },
  { value: 'Anexo 3', label: 'Anexo 3' },
  { value: 'Anexo 4 - Plano de Transferência Operacional (PTO)', label: 'Anexo 4 - Plano de Transferência Operacional (PTO)' },
  { value: 'Anexo 5 - Tarifas Aeroportuárias', label: 'Anexo 5 - Tarifas Aeroportuárias' },
  { value: 'Anexo 6 - Contrato de Administração de Contas', label: 'Anexo 6 - Contrato de Administração de Contas' },
  { value: 'Anexo 7', label: 'Anexo 7' },
  { value: 'Anexo 8 - Termo de Aceitação e Permissão de Uso de Ativos', label: 'Anexo 8 - Termo de Aceitação e Permissão de Uso de Ativos' },
  { value: 'Anexo 9', label: 'Anexo 9' },
  { value: 'Anexo 10', label: 'Anexo 10' },
  { value: 'Anexo 11', label: 'Anexo 11' },
  { value: 'Anexo 12', label: 'Anexo 12' },
  { value: 'Anexo 13', label: 'Anexo 13' },
  { value: 'Anexo 14', label: 'Anexo 14' },
  { value: 'Anexo 15', label: 'Anexo 15' },
  { value: 'Anexo 16', label: 'Anexo 16' },
  { value: 'Anexo 17 - Caderno de Penalidades', label: 'Anexo 17 - Caderno de Penalidades' },
  { value: 'Anexo 18', label: 'Anexo 18' },
  { value: 'Edital', label: 'Edital' },
]

const RECORRENCIAS_PERIODICAS = [
  'Periódica - Mensal',
  'Periódica - Anual',
  'Periódica - Conforme Vigência',
]

const SEM_PRAZO = ['Contínua', 'Encerramento da Concessão']

function NovaObrigacao() {
  const [form] = Form.useForm()
  const [salvando, setSalvando] = useState(false)
  const [tipoGatilho, setTipoGatilho] = useState(null)
  const [tipoCondicao, setTipoCondicao] = useState('evento_externo')
  const [obrigacoesLista, setObrigacoesLista] = useState([])
  const [recorrenciaAtual, setRecorrenciaAtual] = useState(null)
  const [emailAtivado, setEmailAtivado] = useState(false)
  const [lembreteUnicoAtivo, setLembreteUnicoAtivo] = useState(false)
  const [recorrenciaAtiva, setRecorrenciaAtiva] = useState(false)
  const [lembretePersonalizado, setLembretePersonalizado] = useState(false)

  useEffect(() => {
    if (tipoGatilho !== 'eventual') return
    api.obrigacoes.listar({ limit: 500 }).then(res => {
      setObrigacoesLista(res.items.map(o => ({
        value: o.id,
        label: `${o.item_number || o.obligation_code || 'ID ' + o.id} — ${(o.obligation_text || '').slice(0, 80)}`,
      })))
    }).catch(() => {})
  }, [tipoGatilho])

  const onRecorrenciaChange = (val) => {
    setRecorrenciaAtual(val || null)
    setLembretePersonalizado(false)
    const isEventual = (val || '').toLowerCase().includes('eventual')
    setTipoGatilho(isEventual ? 'eventual' : null)
    if (!isEventual) setTipoCondicao('evento_externo')
  }

  const onSalvar = async (valores) => {
    setSalvando(true)
    try {
      const emails = (valores.emails || []).map(e => e?.email?.trim()).filter(Boolean)

      const date = valores.manual_reminder_date
      const time = valores.manual_reminder_time
      const manual_reminder_at = (lembreteUnicoAtivo && date)
        ? date.hour(time ? time.hour() : 8).minute(time ? time.minute() : 0).second(0).toISOString()
        : null

      const usaLembreteManual = !hasAutoReminder || lembretePersonalizado

      await api.obrigacoes.criar({
        contract_id: 1,
        obligation_text: valores.obligation_text,
        document_name: valores.document_name || null,
        item_number: valores.item_number || null,
        pagina_contrato: valores.pagina_contrato || null,
        observations: valores.observations || null,
        recurrence: valores.recurrence || null,
        contract_phase: valores.contract_phase || null,
        deadline: valores.deadline ? valores.deadline.toISOString() : null,
        trigger_family: tipoGatilho || null,
        trigger_type: tipoCondicao === 'evento_externo' ? (valores.trigger_type || null) : null,
        condition_raw: tipoCondicao === 'evento_externo' ? (valores.condition_raw || null) : null,
        condition_obligation_id: tipoCondicao === 'cumprimento_obrigacao'
          ? (valores.condition_obligation_id || null)
          : null,
        email_enabled: usaLembreteManual ? (valores.email_enabled || false) : false,
        email_destino: usaLembreteManual && valores.email_enabled && emails.length > 0 ? emails.join(',') : null,
        manual_reminder_at: usaLembreteManual ? manual_reminder_at : null,
        recurrence_mode: usaLembreteManual && recorrenciaAtiva ? 'manual_days' : null,
        recurrence_time: usaLembreteManual && recorrenciaAtiva ? (valores.recurrence_time || '08:00') : null,
        recurrence_interval_days: usaLembreteManual && recorrenciaAtiva ? (valores.recurrence_interval_days || 7) : null,
        recurrence_weekday: null,
        recurrence_day_of_month: null,
        recurrence_month: null,
        status: 'pending',
      })
      message.success('Obrigação criada com sucesso.')
      form.resetFields()
      setTipoGatilho(null)
      setTipoCondicao('evento_externo')
      setRecorrenciaAtual(null)
      setObrigacoesLista([])
      setEmailAtivado(false)
      setLembreteUnicoAtivo(false)
      setRecorrenciaAtiva(false)
      setLembretePersonalizado(false)
    } catch (err) {
      message.error(err?.message || 'Erro ao criar obrigação.')
    } finally {
      setSalvando(false)
    }
  }

  const mostrarPrazo = !SEM_PRAZO.includes(recorrenciaAtual)
  const labelPrazo = RECORRENCIAS_PERIODICAS.includes(recorrenciaAtual) ? 'Data de início' : 'Prazo'
  const placeholderPrazo = RECORRENCIAS_PERIODICAS.includes(recorrenciaAtual) ? 'Início da vigência' : 'Data limite'

  const hasAutoReminder =
    recorrenciaAtual === 'Encerramento da Concessão' ||
    (recorrenciaAtual || '').startsWith('Periódica')

  return (
    <div>
      <Form form={form} layout="vertical" onFinish={onSalvar}>

        {/* Classificação no topo */}
        <Row gutter={24}>
          <Col span={24}>
            <Card title="Classificação" style={{ marginBottom: 16 }}>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item label="Fase" name="contract_phase" style={{ marginBottom: 0 }}>
                    <Select
                      placeholder="Selecione a fase contratual"
                      allowClear
                      options={[
                        { value: 'Fase I-A', label: 'Fase I-A' },
                        { value: 'Fase I-A (Estágio 1)', label: 'Fase I-A (Estágio 1)' },
                        { value: 'Fase I-A (Estágio 2)', label: 'Fase I-A (Estágio 2)' },
                        { value: 'Fase I-A (Estágio 3)', label: 'Fase I-A (Estágio 3)' },
                        { value: 'Fase I-B', label: 'Fase I-B' },
                        { value: 'Fase II', label: 'Fase II' },
                        { value: 'Encerramento', label: 'Encerramento' },
                        { value: 'Todas as fases', label: 'Todas as fases' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Recorrência" name="recurrence" style={{ marginBottom: 0 }}>
                    <Select
                      placeholder="Selecione a recorrência"
                      allowClear
                      onChange={onRecorrenciaChange}
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
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Row gutter={24} align="stretch">

          {/* Coluna principal */}
          <Col span={16}>
            <Card title="Dados da Obrigação" style={{ marginBottom: 16 }}>
              <Form.Item label="Documento" name="document_name" rules={[{ required: true, message: 'Selecione o documento' }]}>
                <Select
                  placeholder="Selecione o documento"
                  showSearch
                  optionFilterProp="label"
                  options={DOCUMENTOS.map(d => ({ ...d, label: getLabelDocumento(d.value) }))}
                />
              </Form.Item>

              <Form.Item label="Obrigação" name="obligation_text" rules={[{ required: true, message: 'Descreva a obrigação' }]}>
                <TextArea rows={5} placeholder="Descreva a obrigação conforme o contrato ou anexo..." />
              </Form.Item>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Número do item" name="item_number">
                    <Input placeholder="Ex: 4.2.1" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Página no contrato" name="pagina_contrato">
                    <InputNumber min={1} max={136} placeholder="Ex: 42" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                {mostrarPrazo && (
                  <Col span={8}>
                    <Form.Item label={labelPrazo} name="deadline">
                      <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder={placeholderPrazo} />
                    </Form.Item>
                  </Col>
                )}
              </Row>

              <Form.Item label="Observações" name="observations" style={{ marginBottom: 0 }}>
                <TextArea rows={2} placeholder="Informações adicionais sobre esta obrigação..." />
              </Form.Item>
            </Card>

            {tipoGatilho === 'eventual' && (
              <Card title="Condição de Ativação" style={{ marginBottom: 16 }}>
                <Form.Item label="Tipo de condição">
                  <Select
                    value={tipoCondicao}
                    onChange={setTipoCondicao}
                    options={[
                      { value: 'evento_externo', label: 'Evento externo' },
                      { value: 'cumprimento_obrigacao', label: 'Cumprimento de obrigação' },
                    ]}
                  />
                </Form.Item>

                {tipoCondicao === 'evento_externo' && (
                  <>
                    <Form.Item label="Descrição do evento" name="trigger_type">
                      <Input placeholder="Ex: Aprovação regulatória, Conclusão de obra..." />
                    </Form.Item>
                    <Form.Item label="Condição" name="condition_raw" style={{ marginBottom: 0 }}>
                      <TextArea
                        rows={4}
                        placeholder="Descreva a condição que precisa ser cumprida para esta obrigação ser ativada..."
                      />
                    </Form.Item>
                  </>
                )}

                {tipoCondicao === 'cumprimento_obrigacao' && (
                  <Form.Item
                    label="Obrigação condicionante"
                    name="condition_obligation_id"
                    style={{ marginBottom: 0 }}
                    rules={[{ required: true, message: 'Selecione a obrigação' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Busque pelo código ou texto da obrigação..."
                      optionFilterProp="label"
                      options={obrigacoesLista}
                      loading={tipoGatilho === 'eventual' && obrigacoesLista.length === 0}
                    />
                  </Form.Item>
                )}
              </Card>
            )}
          </Col>

          {/* Coluna lateral — Lembrete */}
          <Col span={8}>
            {hasAutoReminder && !lembretePersonalizado ? (
              <Card style={{ marginBottom: 16 }}>
                <Title level={5} style={{ marginBottom: 8 }}>Lembrete automático</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  O lembrete desta obrigação é gerenciado automaticamente com base na
                  antecedência configurada em Configurações.
                </Text>
                <Button type="link" style={{ padding: 0 }} onClick={() => setLembretePersonalizado(true)}>
                  Usar lembrete personalizado
                </Button>
              </Card>
            ) : (
              <Card title={hasAutoReminder ? undefined : 'Lembrete por Email'} style={{ marginBottom: 16 }}>
                {hasAutoReminder && (
                  <>
                    <Button
                      type="link"
                      style={{ padding: 0, marginBottom: 12, display: 'block' }}
                      onClick={() => setLembretePersonalizado(false)}
                    >
                      ← Voltar ao lembrete automático
                    </Button>
                    <Title level={5} style={{ marginBottom: 16 }}>Lembrete por Email</Title>
                  </>
                )}

                <Form.Item label="Ativar lembrete" name="email_enabled" valuePropName="checked" style={{ marginBottom: emailAtivado ? 16 : 0 }}>
                  <Switch onChange={setEmailAtivado} />
                </Form.Item>

                {emailAtivado && (
                  <>
                    <Form.List name="emails" initialValue={[{ email: '' }]}>
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map((field, index) => (
                            <Form.Item
                              key={field.key}
                              label={index === 0 ? 'Email' : ''}
                              style={{ marginBottom: 8 }}
                            >
                              <Space.Compact style={{ width: '100%' }}>
                                <Form.Item
                                  {...field}
                                  name={[field.name, 'email']}
                                  noStyle
                                  rules={[
                                    { required: true, message: 'Informe o email' },
                                    { type: 'email', message: 'Email inválido' },
                                  ]}
                                >
                                  <Input placeholder="advogado@escritorio.com" />
                                </Form.Item>
                                {fields.length > 1 && (
                                  <Button icon={<DeleteOutlined />} onClick={() => remove(field.name)} danger />
                                )}
                              </Space.Compact>
                            </Form.Item>
                          ))}
                          <Button
                            type="dashed"
                            onClick={() => add({ email: '' })}
                            icon={<PlusOutlined />}
                            style={{ width: '100%', marginBottom: 16 }}
                          >
                            Adicionar destinatário
                          </Button>
                        </>
                      )}
                    </Form.List>

                    <Space style={{ marginBottom: 16 }}>
                      <Checkbox checked={lembreteUnicoAtivo} onChange={e => setLembreteUnicoAtivo(e.target.checked)}>
                        Lembrete único
                      </Checkbox>
                      <Checkbox checked={recorrenciaAtiva} onChange={e => setRecorrenciaAtiva(e.target.checked)}>
                        Recorrência
                      </Checkbox>
                    </Space>

                    {lembreteUnicoAtivo && (
                      <Row gutter={8}>
                        <Col span={14}>
                          <Form.Item label="Data" name="manual_reminder_date">
                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/AAAA" />
                          </Form.Item>
                        </Col>
                        <Col span={10}>
                          <Form.Item label="Hora" name="manual_reminder_time">
                            <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                      </Row>
                    )}

                    {recorrenciaAtiva && (
                      <Row gutter={8}>
                        <Col span={14}>
                          <Form.Item label="Repetir" name="recurrence_interval_days">
                            <Select options={[
                              { value: 1,   label: 'Todo dia' },
                              { value: 3,   label: 'A cada 3 dias' },
                              { value: 7,   label: 'A cada 7 dias' },
                              { value: 15,  label: 'A cada 15 dias' },
                              { value: 30,  label: 'A cada 30 dias' },
                              ...(recorrenciaAtual === 'Periódica - Anual' ? [
                                { value: 180, label: 'A cada 6 meses' },
                                { value: 365, label: 'A cada 1 ano' },
                              ] : []),
                            ]} />
                          </Form.Item>
                        </Col>
                        <Col span={10}>
                          <Form.Item label="Horário" name="recurrence_time">
                            <Input placeholder="08:00" />
                          </Form.Item>
                        </Col>
                      </Row>
                    )}
                  </>
                )}
              </Card>
            )}
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
