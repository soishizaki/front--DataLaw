import { useEffect, useState } from 'react'
import {
  Alert, Button, Card, Checkbox, Col, DatePicker, Descriptions, Form, Input, InputNumber,
  message, Modal, notification, Row, Select, Space, Spin, Switch, Tag, Timeline, TimePicker, Typography
} from 'antd'
import { ArrowLeftOutlined, DeleteOutlined, FileProtectOutlined, MailOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../services/api'
import { lerEmails } from './Configuracoes'

const { Title, Text } = Typography
const { TextArea } = Input

function parseDiasEvento(deadlineValue) {
  if (!deadlineValue) return null
  if (/imediato/i.test(deadlineValue)) return 0
  const m = deadlineValue.match(/N:\s*(\d+)\s*dias?/i)
  return m ? parseInt(m[1]) : null
}

function normalizarFase(fase) {
  if (!fase) return null
  const idx = fase.indexOf('(Adicionado por IA:')
  let clean = (idx > 0 ? fase.slice(0, idx) : fase).trim()
  if (clean.startsWith('* ')) clean = clean.slice(2)
  return clean
}

const DOCUMENTO_PDF = {
  'Contrato': '/contrato.pdf',
  'Anexo 1 - Regulamento da Concessão': '/anexo1.pdf',
  'Anexo 2 - Plano de Exploração Aeroportuária (PEA)': '/anexo2.pdf',
  'Anexo 4 - Plano de Transferência Operacional (PTO)': '/anexo4.pdf',
  'Anexo 5 - Tarifas Aeroportuárias': '/anexo5.pdf',
  'Anexo 6 - Contrato de Administração de Contas': '/anexo6.pdf',
  'Anexo 8 - Termo de Aceitação e Permissão de Uso de Ativos': '/anexo8.pdf',
  'Anexo 17 - Caderno de Penalidades': '/anexo17.pdf',
}

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

function ObrigacaoDetalhe({ id, onVoltar, onVerDetalhe }) {
  const [dados, setDados] = useState(null)
  const [historico, setHistorico] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvandoEmail, setSalvandoEmail] = useState(false)
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [emailAtivado, setEmailAtivado] = useState(false)
  const [lembreteUnicoAtivo, setLembreteUnicoAtivo] = useState(false)
  const [recorrenciaAtiva, setRecorrenciaAtiva] = useState(false)
  const [marcandoCondicao, setMarcandoCondicao] = useState(false)
  const [salvandoPrazo, setSalvandoPrazo] = useState(false)
  const [prazoEditado, setPrazoEditado] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const [paginaEditando, setPaginaEditando] = useState(false)
  const [paginaValor, setPaginaValor] = useState(null)
  const [salvandoPagina, setSalvandoPagina] = useState(false)
  const [dependentes, setDependentes] = useState([])
  const [condicaoObrigacao, setCondicaoObrigacao] = useState(null)
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

      // Carrega dependentes (eventuais que dependem desta)
      try {
        const depRes = await api.obrigacoes.buscarDependentes(id)
        setDependentes(depRes.dependents || [])
      } catch { setDependentes([]) }

      // Carrega obrigação-condição (se esta é eventual com dependência)
      if (o.has_dependency) {
        // Não temos o condition_id direto, então buscamos via dependents do obligation vinculado
        // Por ora deixamos a seção mostrar o texto de depends_on_clauses
        setCondicaoObrigacao(null)
      }
      formStatus.setFieldsValue({ status: o.status })
      const emailsSalvos = o.email_destino
        ? o.email_destino.split(',').map(e => e.trim()).filter(Boolean)
        : []
      const emailsIniciais = emailsSalvos.length > 0 ? emailsSalvos : lerEmails()
      const emailsExistentes = emailsIniciais.length > 0
        ? emailsIniciais.map(e => ({ email: e }))
        : [{ email: '' }]
      setLembreteUnicoAtivo(!!o.manual_reminder_at)
      setRecorrenciaAtiva(!!(o.recurrence_mode))
      formEmail.setFieldsValue({
        email_enabled: o.email_enabled,
        emails: emailsExistentes,
        manual_reminder_date: o.manual_reminder_at ? dayjs(o.manual_reminder_at) : null,
        manual_reminder_time: o.manual_reminder_at ? dayjs(o.manual_reminder_at) : dayjs('08:00', 'HH:mm'),
        recurrence_interval_days: o.recurrence_interval_days || 7,
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

      if (resultado.activated_obligations?.length > 0) {
        notification.success({
          message: 'Obrigações eventuais ativadas',
          description: `As seguintes obrigações eventuais foram ativadas automaticamente: ${resultado.activated_obligations.join(', ')}`,
          duration: 8,
        })
        // Recarrega dependentes para refletir novo estado
        try {
          const depRes = await api.obrigacoes.buscarDependentes(id)
          setDependentes(depRes.dependents || [])
        } catch { /* ignora */ }
      }
    } catch (err) {
      message.error(err.message || 'Erro ao atualizar status.')
    } finally {
      setSalvando(false)
    }
  }

  const onSalvarEmail = async (valores) => {
    const lista = (valores.emails || [])
      .map(e => e?.email?.trim())
      .filter(Boolean)
    if (valores.email_enabled && lista.length === 0) {
      message.warning('Adicione pelo menos um email de destino.')
      return
    }
    setSalvandoEmail(true)
    try {
      const manualAt = lembreteUnicoAtivo && valores.manual_reminder_date
        ? dayjs(valores.manual_reminder_date)
            .hour(valores.manual_reminder_time?.hour() ?? 8)
            .minute(valores.manual_reminder_time?.minute() ?? 0)
            .second(0)
            .format('YYYY-MM-DDTHH:mm:ss')
        : null
      const resultado = await api.obrigacoes.atualizar(id, {
        email_enabled: valores.email_enabled,
        email_destino: valores.email_enabled ? lista.join(',') : null,
        manual_reminder_at: manualAt,
        recurrence_mode: recorrenciaAtiva ? 'manual_days' : '',
        recurrence_time: recorrenciaAtiva ? (valores.recurrence_time || '08:00') : null,
        recurrence_interval_days: recorrenciaAtiva ? (valores.recurrence_interval_days || 7) : null,
        recurrence_weekday: null,
        recurrence_day_of_month: null,
        recurrence_month: null,
      })
      setDados(resultado.obligation)
      message.success('Configuração de email salva.')
    } catch (err) {
      message.error(err?.message || 'Erro ao salvar configuração de email.')
    } finally {
      setSalvandoEmail(false)
    }
  }

  const onMarcarCondicao = async (novoStatus) => {
    setMarcandoCondicao(true)
    try {
      const payload = { condition_status: novoStatus }
      if (novoStatus === 'cumprida') {
        const dias = parseDiasEvento(dados.deadline_value)
        if (dias !== null) {
          const dt = new Date()
          dt.setDate(dt.getDate() + dias)
          payload.deadline = dt.toISOString()
        }
      }
      const resultado = await api.obrigacoes.atualizar(id, payload)
      setDados(resultado.obligation)
      setPrazoEditado(null)
      message.success(novoStatus === 'cumprida' ? 'Condição marcada como cumprida.' : 'Condição reaberta.')
    } catch {
      message.error('Erro ao atualizar condição.')
    } finally {
      setMarcandoCondicao(false)
    }
  }

  const onSalvarPrazo = async () => {
    if (!prazoEditado) { message.warning('Selecione uma data.'); return }
    setSalvandoPrazo(true)
    try {
      const resultado = await api.obrigacoes.atualizar(id, {
        deadline: prazoEditado.toISOString(),
      })
      setDados(resultado.obligation)
      setPrazoEditado(null)
      message.success('Prazo salvo.')
    } catch {
      message.error('Erro ao salvar prazo.')
    } finally {
      setSalvandoPrazo(false)
    }
  }

  const onRemoverPrazo = async () => {
    setSalvandoPrazo(true)
    try {
      const resultado = await api.obrigacoes.atualizar(id, { deadline: null })
      setDados(resultado.obligation)
      setPrazoEditado(null)
      message.success('Prazo removido.')
    } catch {
      message.error('Erro ao remover prazo.')
    } finally {
      setSalvandoPrazo(false)
    }
  }

  const onSalvarPaginaContrato = async () => {
    setSalvandoPagina(true)
    try {
      const resultado = await api.obrigacoes.atualizar(id, { pagina_contrato: paginaValor || null })
      setDados(resultado.obligation)
      setPaginaEditando(false)
      message.success(paginaValor ? 'Página no contrato salva.' : 'Referência removida.')
    } catch {
      message.error('Erro ao salvar página.')
    } finally {
      setSalvandoPagina(false)
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
    } catch (err) {
      message.error(err?.message || 'Erro ao enviar email.')
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
  const isContinua = (dados.recurrence || '').toLowerCase().startsWith('contín')
  const isPontual = (dados.recurrence || '').toLowerCase() === 'pontual'
  const hasAutoReminder = !isEventual && !isPontual && !isContinua

  const proxDia1 = () => {
    const hoje = new Date()
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }
  const ultimoEnvioContinua = () => {
    if (!dados.last_email_sent_at) return '—'
    const d = new Date(dados.last_email_sent_at)
    const dia1 = new Date(d.getFullYear(), d.getMonth(), 1)
    return dia1.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  const statusEnvioContinua = () => {
    if (!dados.last_email_sent_at) return 'Aguardando'
    const sent = new Date(dados.last_email_sent_at)
    const now = new Date()
    if (sent.getMonth() === now.getMonth() && sent.getFullYear() === now.getFullYear()) {
      return 'Enviado este mês'
    }
    return 'Aguardando'
  }
  const conditionPending = isEventual && dados.has_dependency && dados.condition_status !== 'cumprida' && dados.status !== 'completed'
  const aguardandoEvento = isEventual && !dados.has_dependency && dados.status !== 'completed'
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
                {conditionPending
                  ? <Tag color="purple">Aguardando cumprimento de obrigação</Tag>
                  : aguardandoEvento
                    ? <Tag color="gold">Aguardando evento externo</Tag>
                    : <TagStatus status={dados.status} />}
              </Descriptions.Item>
              <Descriptions.Item label="Documento" span={2}>
                {dados.document_name || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Obrigação" span={2}>
                {dados.obligation_text}
              </Descriptions.Item>
              <Descriptions.Item label="Responsável" span={1}>
                {isContinua ? 'Concessionária' : (dados.responsible || '—')}
              </Descriptions.Item>
              <Descriptions.Item label="Recorrência" span={1}>
                {dados.recurrence || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Fase" span={1}>
                {normalizarFase(dados.contract_phase) || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Prazo" span={1}>
                {isContinua
                  ? 'Todo dia 1 do mês'
                  : dados.deadline
                    ? new Date(dados.deadline).toLocaleDateString('pt-BR')
                    : dados.next_recurrence_at
                      ? new Date(dados.next_recurrence_at).toLocaleDateString('pt-BR')
                      : <Text type="secondary">Defina o prazo</Text>}
              </Descriptions.Item>

              <Descriptions.Item label="Página no documento" span={1}>
                {paginaEditando ? (
                  <Space size={4}>
                    <InputNumber
                      min={1} max={9999} size="small"
                      value={paginaValor}
                      onChange={setPaginaValor}
                      style={{ width: 80 }}
                    />
                    <Button size="small" type="primary" loading={salvandoPagina} onClick={onSalvarPaginaContrato}>
                      OK
                    </Button>
                    <Button size="small" onClick={() => setPaginaEditando(false)}>✕</Button>
                  </Space>
                ) : dados.pagina_contrato ? (
                  <Space>
                    <Button
                      type="link" size="small" icon={<FileProtectOutlined />} style={{ padding: 0 }}
                      onClick={() => window.open((DOCUMENTO_PDF[dados.document_name] || '/contrato.pdf') + '#page=' + dados.pagina_contrato, '_blank')}
                    >
                      Ver no documento (p. {dados.pagina_contrato})
                    </Button>
                    <Button
                      type="text" size="small"
                      style={{ padding: '0 4px', fontSize: 11, color: '#8c8c8c' }}
                      onClick={() => { setPaginaValor(dados.pagina_contrato); setPaginaEditando(true) }}
                    >
                      Editar
                    </Button>
                  </Space>
                ) : (
                  <Button
                    type="link" size="small" style={{ padding: 0 }}
                    onClick={() => { setPaginaValor(null); setPaginaEditando(true) }}
                  >
                    Definir
                  </Button>
                )}
              </Descriptions.Item>

              {isEventual && (
                <>
                  <Descriptions.Item label="Condição de Ativação" span={2}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      {conditionText && <Text>{conditionText}</Text>}
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

              {isContinua ? (
                <Descriptions.Item label="Próx. recorrência" span={1}>
                  Dia 1 de {proxDia1()}
                </Descriptions.Item>
              ) : dados.next_recurrence_at ? (
                <Descriptions.Item label="Próx. recorrência" span={1}>
                  {new Date(dados.next_recurrence_at).toLocaleString('pt-BR')}
                </Descriptions.Item>
              ) : null}
              {isContinua ? (
                <Descriptions.Item label="Próx. lembrete" span={1}>
                  Dia 1 de {proxDia1()}
                </Descriptions.Item>
              ) : dados.next_reminder_at ? (
                <Descriptions.Item label="Próx. lembrete" span={1}>
                  {new Date(dados.next_reminder_at).toLocaleString('pt-BR')}
                </Descriptions.Item>
              ) : null}
              {(isContinua || dados.last_email_sent_at) && (
                <Descriptions.Item label="Último envio" span={1}>
                  {isContinua ? ultimoEnvioContinua() : new Date(dados.last_email_sent_at).toLocaleString('pt-BR')}
                </Descriptions.Item>
              )}
              {(isContinua || dados.status_envio) && (
                <Descriptions.Item label="Status envio" span={1}>
                  {isContinua ? statusEnvioContinua() : dados.status_envio}
                </Descriptions.Item>
              )}
              {dados.observations && (
                <Descriptions.Item label="Observações" span={2}>
                  {dados.observations}
                </Descriptions.Item>
              )}

              {dependentes.length > 0 && (
                <Descriptions.Item label="Ativa ao concluir" span={2}>
                  <Space wrap>
                    {dependentes.map(d => (
                      <Tag
                        key={d.id}
                        color={d.condition_status === 'cumprida' ? 'green' : 'purple'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onVerDetalhe?.(d.id)}
                      >
                        {d.item_number || d.obligation_code || `ID ${d.id}`}
                        {d.condition_status === 'cumprida' ? ' ✓' : ''}
                      </Tag>
                    ))}
                  </Space>
                  <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                    Ao concluir esta obrigação, as eventuais acima serão ativadas automaticamente.
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {((isEventual && dados.condition_status === 'cumprida') || isPontual) && (
            <Card style={{ marginBottom: 16 }}>
              <Title level={5} style={{ marginBottom: 12 }}>Prazo de Cumprimento</Title>
              {dados.deadline ? (
                <Space direction="vertical" size={2} style={{ marginBottom: 8 }}>
                  <Text>Prazo definido: <strong>{new Date(dados.deadline).toLocaleDateString('pt-BR')}</strong></Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Para alterar, selecione uma nova data:</Text>
                </Space>
              ) : isEventual && parseDiasEvento(dados.deadline_value) === null ? (
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  O prazo não está definido explicitamente no contrato. Insira a data limite manualmente.
                </Text>
              ) : !dados.deadline ? (
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Nenhum prazo definido. Selecione uma data para esta obrigação.
                </Text>
              ) : null}
              <Space wrap>
                <DatePicker
                  format="DD/MM/YYYY"
                  placeholder="Selecione a data"
                  value={prazoEditado}
                  onChange={setPrazoEditado}
                />
                <Button type="primary" loading={salvandoPrazo} onClick={onSalvarPrazo}>
                  {dados.deadline ? 'Atualizar prazo' : 'Confirmar prazo'}
                </Button>
                {dados.deadline && (
                  <Button danger loading={salvandoPrazo} onClick={onRemoverPrazo}>
                    Remover prazo
                  </Button>
                )}
              </Space>
            </Card>
          )}

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
          ) : hasAutoReminder ? (
            <Card style={{ marginBottom: 16 }}>
              <Title level={5} style={{ marginBottom: 8 }}>Lembrete automático</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                O lembrete desta obrigação é gerenciado automaticamente com base na antecedência configurada em Configurações.
              </Text>
              {dados.next_reminder_at && (
                <Text>Próximo envio: <strong>{new Date(dados.next_reminder_at).toLocaleDateString('pt-BR')}</strong></Text>
              )}
            </Card>
          ) : (isEventual && dados.condition_status !== 'cumprida') ? null : (
            <Card style={{ marginBottom: 16 }}>
              <Title level={5} style={{ marginBottom: 16 }}>Lembrete por Email</Title>
              <Form form={formEmail} layout="vertical" onFinish={onSalvarEmail}>
                <Form.Item label="Ativar lembrete" name="email_enabled" valuePropName="checked">
                  <Switch onChange={setEmailAtivado} />
                </Form.Item>

                {emailAtivado && (
                  <>
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
                      <Checkbox
                        checked={lembreteUnicoAtivo}
                        onChange={e => setLembreteUnicoAtivo(e.target.checked)}
                      >
                        Lembrete único
                      </Checkbox>
                      <Checkbox
                        checked={recorrenciaAtiva}
                        onChange={e => setRecorrenciaAtiva(e.target.checked)}
                      >
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
                            <Select
                              options={[
                                { value: 1,   label: 'Todo dia' },
                                { value: 3,   label: 'A cada 3 dias' },
                                { value: 7,   label: 'A cada 7 dias' },
                                { value: 15,  label: 'A cada 15 dias' },
                                { value: 30,  label: 'A cada 30 dias' },
                                ...(dados?.recurrence === 'Periódica - Anual' ? [
                                  { value: 180, label: 'A cada 6 meses' },
                                  { value: 365, label: 'A cada 1 ano' },
                                ] : []),
                              ]}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={10}>
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
