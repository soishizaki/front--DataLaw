import { useEffect } from 'react'
import { Button, Card, Form, Input, message, Typography } from 'antd'

const { Title, Text } = Typography
const CHAVE_EMAIL = 'email_global_destinatario'

function Configuracoes() {
  const [form] = Form.useForm()

  useEffect(() => {
    const emailSalvo = localStorage.getItem(CHAVE_EMAIL)
    if (emailSalvo) form.setFieldsValue({ email: emailSalvo })
  }, [])

  const onSalvar = ({ email }) => {
    localStorage.setItem(CHAVE_EMAIL, email)
    message.success('Email salvo com sucesso.')
  }

  return (
    <div>
      <Title level={5} style={{ marginBottom: 24 }}>Configurações</Title>
      <Card style={{ maxWidth: 480 }}>
        <Title level={5} style={{ marginBottom: 4 }}>Email de destino dos lembretes</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Todos os lembretes automáticos serão enviados para este endereço.
        </Text>
        <Form form={form} layout="vertical" onFinish={onSalvar}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Informe o email' },
              { type: 'email', message: 'Digite um email válido' },
            ]}
          >
            <Input placeholder="advogados@escritorio.com" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit">Salvar</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Configuracoes
export { CHAVE_EMAIL }
