import { useEffect, useState } from 'react'
import { Button, Card, Col, Form, Input, message, Row, Select, Space, Typography } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { api } from '../services/api'

const { Title, Text } = Typography

const CHAVE_EMAIL = 'email_global_destinatario'
const CHAVE_ANTECEDENCIA = 'config_antecedencia'

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

function lerAntecedencia() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_ANTECEDENCIA))
    if (salvo && salvo.frequencia) return salvo
    return { frequencia: 7 }
  } catch { return { frequencia: 7 } }
}

function Configuracoes() {
  const [form] = Form.useForm()
  const [savedEmailAt, setSavedEmailAt] = useState(null)
  const [savedAntecedenciaAt, setSavedAntecedenciaAt] = useState(null)
  const [frequencia, setFrequencia] = useState(7)
  const [emailEscritorio, setEmailEscritorio] = useState('')
  const [savedEscritorioAt, setSavedEscritorioAt] = useState(null)
  const [salvandoEscritorio, setSalvandoEscritorio] = useState(false)

  useEffect(() => {
    const emails = lerEmails()
    form.setFieldsValue({ emails: emails.length > 0 ? emails.map(e => ({ email: e })) : [{ email: '' }] })
    setFrequencia(lerAntecedencia().frequencia)
    api.configuracoes.buscar()
      .then(d => setEmailEscritorio(d.email_escritorio || ''))
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

  const onSalvarAntecedencia = () => {
    localStorage.setItem(CHAVE_ANTECEDENCIA, JSON.stringify({ frequencia }))
    setSavedAntecedenciaAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    message.success('Frequência de lembretes salva.')
  }

  const onSalvarEscritorio = async () => {
    if (emailEscritorio && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEscritorio)) {
      message.error('Email inválido.')
      return
    }
    setSalvandoEscritorio(true)
    try {
      await api.configuracoes.salvar({ email_escritorio: emailEscritorio || null })
      setSavedEscritorioAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      message.success('Email do escritório salvo.')
    } catch {
      message.error('Erro ao salvar.')
    } finally {
      setSalvandoEscritorio(false)
    }
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
        <Col span={24}>
          <Card>
            <Title level={5} style={{ marginBottom: 4 }}>Frequência dos lembretes</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Após o primeiro aviso, repetir o lembrete a cada quantos dias até a obrigação ser cumprida.
            </Text>
            <Form.Item label="Repetir a cada" style={{ marginBottom: 16 }}>
              <Select
                value={frequencia}
                onChange={setFrequencia}
                style={{ width: 200 }}
                options={[
                  { value: 7, label: '7 dias' },
                  { value: 15, label: '15 dias' },
                  { value: 30, label: '30 dias' },
                ]}
              />
            </Form.Item>
            <div>
              <Button type="primary" onClick={onSalvarAntecedencia}>Salvar</Button>
              {savedAntecedenciaAt && (
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                  Salvo às {savedAntecedenciaAt}
                </Text>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card>
            <Title level={5} style={{ marginBottom: 4 }}>Lembrete mensal do escritório</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              No dia 1 de cada mês, o sistema envia um aviso para este email para checar o cumprimento das obrigações contínuas.
            </Text>
            <Form.Item label="Email do escritório" style={{ marginBottom: 16 }}>
              <Input
                type="email"
                value={emailEscritorio}
                onChange={e => setEmailEscritorio(e.target.value)}
                placeholder="escritorio@pessoa-valente.com.br"
                style={{ maxWidth: 400 }}
              />
            </Form.Item>
            <div>
              <Button type="primary" onClick={onSalvarEscritorio} loading={salvandoEscritorio}>Salvar</Button>
              {savedEscritorioAt && (
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                  Salvo às {savedEscritorioAt}
                </Text>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Configuracoes
export { CHAVE_EMAIL, CHAVE_ANTECEDENCIA, lerEmails, lerAntecedencia }
