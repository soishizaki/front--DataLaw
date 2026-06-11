import { useEffect, useRef, useState } from 'react'
import { Button, Card, Col, Form, Input, InputNumber, message, Modal, Row, Select, Space, Tooltip, Typography } from 'antd'
const { TextArea } = Input
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { api } from '../services/api'

const { Title, Text } = Typography

const VARIAVEIS = [
  { chave: '{tipo}',      label: 'Tipo de recorrência', exemplo: 'Periódica - Mensal' },
  { chave: '{documento}', label: 'Documento de origem',  exemplo: 'Contrato' },
  { chave: '{item}',      label: 'Número do item',       exemplo: '4.2.1' },
  { chave: '{obrigacao}', label: 'Texto da obrigação',   exemplo: 'Comunicar à ARTESP em até 15 dias...' },
  { chave: '{prazo}',     label: 'Data do lembrete',     exemplo: '25/06/2026 08:00' },
  { chave: '{status}',    label: 'Status atual',         exemplo: 'Pendente' },
]

const EXEMPLO_VARS = {
  tipo: 'Periódica - Mensal',
  documento: 'Contrato',
  item: '4.2.1',
  obrigacao: 'Comunicar à ARTESP em até 15 dias após os atos consumados...',
  prazo: '25/06/2026 08:00',
  status: 'Pendente',
}

const CHAVE_EMAIL = 'email_global_destinatario'

function lerEmails() {
  const salvo = localStorage.getItem(CHAVE_EMAIL)
  if (!salvo) return []
  try {
    const parsed = JSON.parse(salvo)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return salvo ? [salvo] : []
  }
}

function Configuracoes() {
  const [form] = Form.useForm()
  const [formEscritorio] = Form.useForm()
  const [savedEmailAt, setSavedEmailAt] = useState(null)
  const [savedEscritorioAt, setSavedEscritorioAt] = useState(null)
  const [salvandoEscritorio, setSalvandoEscritorio] = useState(false)
  const [antMensal, setAntMensal] = useState(7)
  const [antAnual, setAntAnual] = useState(30)
  const [antEncerramento, setAntEncerramento] = useState(180)
  const [freqMensal, setFreqMensal] = useState(3)
  const [freqAnual, setFreqAnual] = useState(7)
  const [freqEncerramento, setFreqEncerramento] = useState(30)
  const [salvandoAntecedencia, setSalvandoAntecedencia] = useState(false)
  const [savedAntecedenciaPrazoAt, setSavedAntecedenciaPrazoAt] = useState(null)
  const [emailAssunto, setEmailAssunto] = useState('')
  const [emailCorpo, setEmailCorpo] = useState('')
  const [salvandoTemplate, setSalvandoTemplate] = useState(false)
  const [savedTemplateAt, setSavedTemplateAt] = useState(null)
  const [previewAberta, setPreviewAberta] = useState(false)
  const [campoFocado, setCampoFocado] = useState(null)
  const refAssunto = useRef(null)
  const refCorpo = useRef(null)

  useEffect(() => {
    const emails = lerEmails()
    form.setFieldsValue({ emails: emails.length > 0 ? emails.map(e => ({ email: e })) : [{ email: '' }] })
    api.configuracoes.buscar()
      .then(d => {
        const escritorioEmails = d.email_escritorio
          ? d.email_escritorio.split(',').map(e => ({ email: e.trim() })).filter(e => e.email)
          : [{ email: '' }]
        formEscritorio.setFieldsValue({ emails_escritorio: escritorioEmails })
        if (d.antecedencia_mensal_dias != null) setAntMensal(d.antecedencia_mensal_dias)
        if (d.antecedencia_anual_dias != null) setAntAnual(d.antecedencia_anual_dias)
        if (d.antecedencia_encerramento_dias != null) setAntEncerramento(d.antecedencia_encerramento_dias)
        if (d.frequencia_mensal_dias != null) setFreqMensal(d.frequencia_mensal_dias)
        if (d.frequencia_anual_dias != null) setFreqAnual(d.frequencia_anual_dias)
        if (d.frequencia_encerramento_dias != null) setFreqEncerramento(d.frequencia_encerramento_dias)
        if (d.email_assunto) setEmailAssunto(d.email_assunto)
        if (d.email_corpo) setEmailCorpo(d.email_corpo)
      })
      .catch(() => {})
  }, [])

  const onSalvarEmails = ({ emails }) => {
    const lista = (emails || []).map(e => e?.email?.trim()).filter(Boolean)
    if (lista.length === 0) {
      message.warning('Adicione pelo menos um email.')
      return
    }
    localStorage.setItem(CHAVE_EMAIL, JSON.stringify(lista))
    setSavedEmailAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    message.success('Emails salvos.')
  }

  const onSalvarAntecedenciaPrazo = async () => {
    setSalvandoAntecedencia(true)
    try {
      await api.configuracoes.salvar({
        antecedencia_mensal_dias: antMensal,
        antecedencia_anual_dias: antAnual,
        antecedencia_encerramento_dias: antEncerramento,
        frequencia_mensal_dias: freqMensal,
        frequencia_anual_dias: freqAnual,
        frequencia_encerramento_dias: freqEncerramento,
      })
      setSavedAntecedenciaPrazoAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      message.success('Configurações de lembrete salvas.')
    } catch {
      message.error('Erro ao salvar.')
    } finally {
      setSalvandoAntecedencia(false)
    }
  }

  const onSalvarEscritorio = async ({ emails_escritorio }) => {
    const lista = (emails_escritorio || []).map(e => e?.email?.trim()).filter(Boolean)
    if (lista.length === 0) {
      message.warning('Adicione pelo menos um email.')
      return
    }
    setSalvandoEscritorio(true)
    try {
      await api.configuracoes.salvar({ email_escritorio: lista.join(',') })
      setSavedEscritorioAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      message.success('Emails do escritório salvos.')
    } catch {
      message.error('Erro ao salvar.')
    } finally {
      setSalvandoEscritorio(false)
    }
  }

  const inserirVariavel = (chave) => {
    const textarea = refCorpo.current?.resizableTextArea?.textArea
    const input = refAssunto.current?.input
    if (campoFocado === 'corpo' && textarea) {
      const s = textarea.selectionStart, e = textarea.selectionEnd
      const novo = emailCorpo.slice(0, s) + chave + emailCorpo.slice(e)
      setEmailCorpo(novo)
      setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = s + chave.length; textarea.focus() }, 0)
    } else if (campoFocado === 'assunto' && input) {
      const s = input.selectionStart, e = input.selectionEnd
      const novo = emailAssunto.slice(0, s) + chave + emailAssunto.slice(e)
      setEmailAssunto(novo)
      setTimeout(() => { input.selectionStart = input.selectionEnd = s + chave.length; input.focus() }, 0)
    } else {
      setEmailCorpo(prev => prev + chave)
    }
  }

  const aplicarExemplo = (tpl) => {
    let r = tpl || ''
    for (const [k, v] of Object.entries(EXEMPLO_VARS)) r = r.split(`{${k}}`).join(v)
    return r
  }

  return (
    <div>
      <Title level={5} style={{ marginBottom: 24 }}>Configurações</Title>

      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card>
            <Title level={5} style={{ marginBottom: 4 }}>Emails de destino dos lembretes</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Endereços padrão para lembretes quando nenhum email específico for definido na obrigação.
            </Text>
            <Form form={form} layout="vertical" onFinish={onSalvarEmails}>
              <Form.List name="emails">
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
                              {
                                validator: (_, value) => {
                                  const emails = form.getFieldValue('emails') || []
                                  const duplicado = emails.filter(
                                    e => e?.email?.trim().toLowerCase() === value?.trim().toLowerCase()
                                  ).length > 1
                                  return duplicado
                                    ? Promise.reject('Email já adicionado')
                                    : Promise.resolve()
                                },
                              },
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
                      Adicionar email
                    </Button>
                  </>
                )}
              </Form.List>
              <Form.Item style={{ marginBottom: 4 }}>
                <Button type="primary" htmlType="submit">Salvar</Button>
              </Form.Item>
              {savedEmailAt && (
                <Text type="secondary" style={{ fontSize: 12 }}>Salvo às {savedEmailAt}</Text>
              )}
            </Form>
          </Card>
        </Col>

      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card>
            <Title level={5} style={{ marginBottom: 4 }}>Lembrete mensal do escritório</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              No dia 1 de cada mês, o sistema envia um aviso para estes emails para checar o cumprimento das obrigações contínuas.
            </Text>
            <Form form={formEscritorio} layout="vertical" onFinish={onSalvarEscritorio}>
              <Form.List name="emails_escritorio">
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
                            <Input placeholder="escritorio@pessoa-valente.com.br" />
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
                      Adicionar email
                    </Button>
                  </>
                )}
              </Form.List>
              <Form.Item style={{ marginBottom: 4 }}>
                <Button type="primary" htmlType="submit" loading={salvandoEscritorio}>Salvar</Button>
                {savedEscritorioAt && (
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                    Salvo às {savedEscritorioAt}
                  </Text>
                )}
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card>
            <Title level={5} style={{ marginBottom: 4 }}>Modelo do email de lembrete</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Personalize o assunto e o corpo dos emails de lembrete enviados automaticamente.
            </Text>
            <Form layout="vertical">
              <Form.Item label="Assunto" style={{ marginBottom: 12 }}>
                <Input
                  ref={refAssunto}
                  value={emailAssunto}
                  onChange={e => setEmailAssunto(e.target.value)}
                  onFocus={() => setCampoFocado('assunto')}
                  placeholder="Alerta: obrigação próxima do prazo"
                />
              </Form.Item>
              <Form.Item label="Corpo" style={{ marginBottom: 12 }}>
                <TextArea
                  ref={refCorpo}
                  rows={8}
                  value={emailCorpo}
                  onChange={e => setEmailCorpo(e.target.value)}
                  onFocus={() => setCampoFocado('corpo')}
                  placeholder="Olá,&#10;&#10;Segue um lembrete automático..."
                />
              </Form.Item>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  Clique em uma variável para inseri-la no campo que estiver editando:
                </Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {VARIAVEIS.map(v => (
                    <Tooltip key={v.chave} title={`Exemplo: "${v.exemplo}"`} placement="top">
                      <div
                        onClick={() => inserirVariavel(v.chave)}
                        style={{
                          border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 10px',
                          cursor: 'pointer', background: '#fafafa', userSelect: 'none',
                        }}
                      >
                        <div style={{ fontSize: 11, color: '#8c8c8c', lineHeight: 1.3 }}>{v.label}</div>
                        <code style={{ fontSize: 12, color: '#1677ff' }}>{v.chave}</code>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>
              <div>
                <Space>
                  <Button
                    type="primary"
                    loading={salvandoTemplate}
                    onClick={async () => {
                      setSalvandoTemplate(true)
                      try {
                        await api.configuracoes.salvar({ email_assunto: emailAssunto, email_corpo: emailCorpo })
                        setSavedTemplateAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
                        message.success('Modelo de email salvo.')
                      } catch {
                        message.error('Erro ao salvar.')
                      } finally {
                        setSalvandoTemplate(false)
                      }
                    }}
                  >
                    Salvar
                  </Button>
                  <Button onClick={() => setPreviewAberta(true)}>Visualizar prévia</Button>
                  {savedTemplateAt && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Salvo às {savedTemplateAt}
                    </Text>
                  )}
                </Space>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={20}>
          <Card>
            <Title level={5} style={{ marginBottom: 4 }}>Lembretes por prazo</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
              Configure quando o primeiro lembrete deve ser enviado e com qual frequência ele se repete até a obrigação ser cumprida.
            </Text>
            <Form layout="vertical">
              {[
                { label: 'Periódica - Mensal', ant: antMensal, setAnt: setAntMensal, maxAnt: 90, freq: freqMensal, setFreq: setFreqMensal },
                { label: 'Periódica - Anual', ant: antAnual, setAnt: setAntAnual, maxAnt: 365, freq: freqAnual, setFreq: setFreqAnual },
                { label: 'Encerramento da Concessão', ant: antEncerramento, setAnt: setAntEncerramento, maxAnt: 3650, freq: freqEncerramento, setFreq: setFreqEncerramento },
              ].map(({ label, ant, setAnt, maxAnt, freq, setFreq }) => (
                <div key={label} style={{ marginBottom: 20 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>{label}</Text>
                  <Space size={24} wrap>
                    <Form.Item label="Primeiro lembrete" style={{ marginBottom: 0 }}>
                      <InputNumber
                        min={1}
                        max={maxAnt}
                        value={ant}
                        onChange={v => setAnt(v ?? ant)}
                        addonAfter="dias antes"
                        style={{ width: 200 }}
                      />
                    </Form.Item>
                    <Form.Item label="Repetir a cada" style={{ marginBottom: 0 }}>
                      <Select
                        value={freq}
                        onChange={setFreq}
                        style={{ width: 180 }}
                        options={[
                          { value: 1, label: 'Todo dia' },
                          { value: 2, label: 'A cada 2 dias' },
                          { value: 3, label: 'A cada 3 dias' },
                          { value: 7, label: 'A cada 7 dias' },
                          { value: 15, label: 'A cada 15 dias' },
                          { value: 30, label: 'A cada 30 dias' },
                        ]}
                      />
                    </Form.Item>
                  </Space>
                </div>
              ))}
              <div>
                <Button type="primary" onClick={onSalvarAntecedenciaPrazo} loading={salvandoAntecedencia}>Salvar</Button>
                {savedAntecedenciaPrazoAt && (
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                    Salvo às {savedAntecedenciaPrazoAt}
                  </Text>
                )}
              </div>
            </Form>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Prévia do email (com valores de exemplo)"
        open={previewAberta}
        onCancel={() => setPreviewAberta(false)}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">Assunto:</Text>
          <div style={{ fontWeight: 600, marginTop: 2 }}>{aplicarExemplo(emailAssunto)}</div>
        </div>
        <div style={{ background: '#f9f9f9', border: '1px solid #e8e8e8', borderRadius: 6, padding: 16 }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, fontSize: 13 }}>
            {aplicarExemplo(emailCorpo)}
          </pre>
        </div>
        <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
          Os valores acima são apenas ilustrativos. O email real usará os dados da obrigação correspondente.
        </Text>
      </Modal>
    </div>
  )
}

export default Configuracoes
export { CHAVE_EMAIL, lerEmails }
