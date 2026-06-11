import { ConfigProvider, Divider, Layout, Menu, Typography } from 'antd'
import { useState } from 'react'
import ptBR from 'antd/locale/pt_BR'
import {
  CalendarOutlined,
  DashboardOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  PlusCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons'

import Obrigacoes from './pages/Obrigacoes'
import Dashboard from './pages/Dashboard'
import ObrigacaoDetalhe from './pages/ObrigacaoDetalhe'
import NovaObrigacao from './pages/NovaObrigacao'
import Configuracoes from './pages/Configuracoes'
import Calendario from './pages/Calendario'
import Contrato from './pages/Contrato'

const { Sider, Content, Header } = Layout
const { Text } = Typography

const COR_SIDEBAR = '#2d2d2d'
const COR_PRIMARY = '#E8673A'
const COR_ACCENT  = '#E8673A'

const menuItems = [
  { key: 'dashboard',   label: 'Dashboard',              icon: <DashboardOutlined /> },
  { key: 'obrigacoes',  label: 'Obrigações',              icon: <FileTextOutlined /> },
  { key: 'nova',        label: 'Nova Obrigação',          icon: <PlusCircleOutlined /> },
  { key: 'calendario',  label: 'Calendário',              icon: <CalendarOutlined /> },
  { key: 'contrato',    label: 'Contrato',                icon: <FileProtectOutlined /> },
  { key: 'configuracoes', label: 'Configurações',         icon: <SettingOutlined /> },
]

const titulos = {
  dashboard:    'Dashboard',
  obrigacoes:   'Obrigações',
  detalhe:      'Detalhe da Obrigação',
  nova:         'Nova Obrigação',
  calendario:   'Calendário',
  contrato:     'Contrato de Concessão',
  configuracoes:'Configurações',
}

function App() {
  const [paginaAtual, setPaginaAtual] = useState('dashboard')
  const [obrigacaoSelecionada, setObrigacaoSelecionada] = useState(null)
  const [obrigacoesFiltros, setObrigacoesFiltros] = useState({
    busca: '',
    status: null,
    recorrencia: null,
    pagina: 1,
  })

  const irParaDetalhe = (id) => {
    setObrigacaoSelecionada(id)
    setPaginaAtual('detalhe')
  }

  const voltarParaLista = () => {
    setObrigacaoSelecionada(null)
    setPaginaAtual('obrigacoes')
  }

  const onMenuClick = ({ key }) => {
    setObrigacaoSelecionada(null)
    if (key === 'obrigacoes') {
      setObrigacoesFiltros({ busca: '', status: null, recorrencia: null, pagina: 1 })
    }
    setPaginaAtual(key)
  }

  const navegarComFiltro = (pagina, valor) => {
    if (pagina === 'detalhe') {
      setObrigacaoSelecionada(valor)
      setPaginaAtual('detalhe')
    } else {
      setObrigacoesFiltros({ busca: '', status: valor || null, recorrencia: null, pagina: 1 })
      setPaginaAtual(pagina)
    }
  }

  const renderPagina = () => {
    if (paginaAtual === 'detalhe')     return <ObrigacaoDetalhe id={obrigacaoSelecionada} onVoltar={voltarParaLista} onVerDetalhe={irParaDetalhe} />
    if (paginaAtual === 'obrigacoes')  return <Obrigacoes onVerDetalhe={irParaDetalhe} filtros={obrigacoesFiltros} onFiltrosChange={setObrigacoesFiltros} />
    if (paginaAtual === 'nova')        return <NovaObrigacao />
    if (paginaAtual === 'calendario') return <Calendario onVerDetalhe={irParaDetalhe} />
    if (paginaAtual === 'contrato')      return <Contrato />
    if (paginaAtual === 'configuracoes') return <Configuracoes />
    return <Dashboard onNavegar={navegarComFiltro} />
  }

  return (
    <ConfigProvider
      locale={ptBR}
      theme={{
        token: {
          colorPrimary: COR_PRIMARY,
          borderRadius: 6,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#fafafa' }}>

        <Sider
          width={220}
          style={{
            position: 'fixed',
            height: '100vh',
            left: 0, top: 0, bottom: 0,
            overflow: 'auto',
            background: COR_SIDEBAR,
          }}
        >
          <div style={{ padding: '24px 20px 16px' }}>
            <div style={{
              width: 36, height: 36,
              background: COR_ACCENT,
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 12,
            }}>
              <Text style={{ color: '#ffffff', fontWeight: 700, fontSize: 14 }}>PV</Text>
            </div>
            <Text style={{ color: '#ffffff', fontWeight: 600, fontSize: 13, display: 'block', lineHeight: 1.3 }}>
              Pessoa Valente
            </Text>
            <Text style={{ color: '#aaaaaa', fontSize: 11, display: 'block' }}>
              Advogados
            </Text>
            <Divider style={{ borderColor: '#484848', margin: '14px 0 4px' }} />
            <Text style={{ color: '#aaaaaa', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
              DataLaw
            </Text>
          </div>

          <Menu
            mode="inline"
            selectedKeys={[paginaAtual === 'detalhe' ? 'obrigacoes' : paginaAtual]}
            items={menuItems}
            onClick={onMenuClick}
            style={{ background: COR_SIDEBAR, borderRight: 0 }}
            theme="dark"
          />
        </Sider>

        <Layout style={{ marginLeft: 220 }}>
          <Header style={{
            background: '#ffffff',
            padding: '0 32px',
            borderBottom: '1px solid #e8ecf0',
            display: 'flex',
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 17, fontWeight: 600, color: '#0f1f3d' }}>
              {titulos[paginaAtual] || ''}
            </Text>
          </Header>

          <Content style={{ margin: '24px', background: '#ffffff', padding: '28px', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {renderPagina()}
          </Content>
        </Layout>

      </Layout>
    </ConfigProvider>
  )
}

export default App
