import { useEffect, useState } from 'react'
import {
  Alert, Button, Card, DatePicker, Form, Input, message,
  Select, Switch, Typography
} from 'antd'
import { api } from '../services/api'
import { CHAVE_EMAIL } from './Configuracoes'

const { Title } = Typography
const { TextArea } = Input

function NovaObrigacao() {
  const [form] = Form.useForm()
  const [contratos, setContratos] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [tipoGatilho, setTipoGatilho] = useState(null)
  const [emailAtivado, setEmailAtivado] = useState(false)

  useEffect(() => {
    api.contratos.listar().then(setContratos).catch(() => {
      message.error('Erro ao carregar contratos.')
    })
  }, [])

  const onSalvar = async (valores) => {
    setSalvando(true)
    try {
      const emailGlobal = localStorage.getItem(CHAVE_EMAIL)
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
        email_destino: valores.email_enabled ? emailGlobal : null,
        data_envio_email: valores.data_envio_email
          ? valores.data_envio_email.toISOString()
          : null,
        status: 'pending',
      })
      message.success('Obrigação criada com sucesso.')
      form.resetFields()
      setTipoGatilho(null)
      setEmailAtivado(false)
    } catch {
      message.error('Erro ao criar obrigação.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <Title level={5} style={{ marginBottom: 24 }}>Nova Obrigação</Title>
      <Card style={{ maxWidth: 720 }}>
        <Form form={form} layout="vertical" onFinish={onSalvar}>

          <Form.Item label="Contrato" name="contract_id" rules={[{ required: true, message: 'Selecione o contrato' }]}>
            <Select
              placeholder="Selecione o contrato"
              options={contratos.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>

          <Form.Item label="Obrigação" name="obligation_text" rules={[{ required: true, message: 'Descreva a obrigação' }]}>
            <TextArea rows={4} placeholder="Descreva a obrigação conforme o contrato ou anexo..." />
          </Form.Item>

          <Form.Item label="Documento / Anexo" name="document_name">
            <Input placeholder="Ex: Anexo III, Adendo 2..." />
          </Form.Item>

          <Form.Item label="Número do item" name="item_number">
            <Input placeholder="Ex: 4.2.1" />
          </Form.Item>

          <Form.Item label="Responsável" name="responsible">
            <Input placeholder="Ex: Concessionária, ARTESP..." />
          </Form.Item>

          <Form.Item label="Recorrência" name="recurrence">
            <Select
              placeholder="Selecione a recorrência"
              allowClear
              options={[
                { value: 'Mensal', label: 'Mensal' },
                { value: 'Trimestral', label: 'Trimestral' },
                { value: 'Semestral', label: 'Semestral' },
                { value: 'Anual', label: 'Anual' },
                { value: 'Única', label: 'Única' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Prazo" name="deadline">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Tipo de obrigação" name="trigger_family">
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

          {tipoGatilho === 'eventual' && (
            <>
              <Form.Item label="Tipo do gatilho" name="trigger_type">
                <Input placeholder="Ex: Aprovação regulatória, Conclusão de obra..." />
              </Form.Item>
              <Form.Item label="Condição" name="condition_raw">
                <TextArea
                  rows={3}
                  placeholder="Descreva a condição que precisa ser cumprida para esta obrigação ser ativada..."
                />
              </Form.Item>
            </>
          )}

          <Form.Item label="Ativar lembrete por email" name="email_enabled" valuePropName="checked">
            <Switch onChange={setEmailAtivado} />
          </Form.Item>

          {emailAtivado && (
            <>
              {!localStorage.getItem(CHAVE_EMAIL) && (
                <Alert
                  type="warning"
                  message="Email não configurado"
                  description="Defina o email global em Configurações antes de criar com lembrete."
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              <Form.Item label="Enviar para">
                <Input
                  value={localStorage.getItem(CHAVE_EMAIL) || '—'}
                  disabled
                  suffix={<Typography.Text type="secondary" style={{ fontSize: 12 }}>definido em Configurações</Typography.Text>}
                />
              </Form.Item>
              <Form.Item label="Data de envio do lembrete" name="data_envio_email">
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Quando o lembrete deve ser enviado"
                />
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={salvando}>
              Criar obrigação
            </Button>
          </Form.Item>

        </Form>
      </Card>
    </div>
  )
}

export default NovaObrigacao
