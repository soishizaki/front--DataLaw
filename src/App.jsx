import { ConfigProvider, Layout, Menu, Typography } from 'antd'
import { useState } from 'react'
import ptBR from 'antd/locale/pt_BR'

import Obrigacoes from './pages/Obrigacoes'
import Dashboard from './pages/Dashboard'
import ObrigacaoDetalhe from './pages/ObrigacaoDetalhe'
import NovaObrigacao from './pages/NovaObrigacao'
import Configuracoes from './pages/Configuracoes'
import Relatorio from './pages/Relatorio'

const { Sider, Content, Header } = Layout
const { Title } = Typography

const menuItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'obrigacoes', label: 'Obrigações' },
  { key: 'relatorio', label: 'Relatório de Urgências' },
  { key: 'nova', label: 'Nova Obrigação' },
  { key: 'configuracoes', label: 'Configurações' },
]

function App() {
  const [paginaAtual, setPaginaAtual] = useState('dashboard')
  const [obrigacaoSelecionada, setObrigacaoSelecionada] = useState(null)
  const [filtroInicial, setFiltroInicial] = useState(null)

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
    setFiltroInicial(null)
    setPaginaAtual(key)
  }

  const navegarComFiltro = (pagina, valor) => {
    if (pagina === 'detalhe') {
      setObrigacaoSelecionada(valor)
      setPaginaAtual('detalhe')
    } else {
      setFiltroInicial(valor)
      setPaginaAtual(pagina)
    }
  }

  const tituloPagina = () => {
    if (paginaAtual === 'detalhe') return 'Detalhe da Obrigação'
    return menuItems.find(i => i.key === paginaAtual)?.label
  }

  const renderPagina = () => {
    if (paginaAtual === 'detalhe') {
      return <ObrigacaoDetalhe id={obrigacaoSelecionada} onVoltar={voltarParaLista} />
    }
    if (paginaAtual === 'obrigacoes') {
      return <Obrigacoes onVerDetalhe={irParaDetalhe} filtroInicial={filtroInicial} />
    }
    if (paginaAtual === 'relatorio') {
      return <Relatorio onVerDetalhe={irParaDetalhe} />
    }
    if (paginaAtual === 'nova') {
      return <NovaObrigacao />
    }
    if (paginaAtual === 'configuracoes') {
      return <Configuracoes />
    }
    return <Dashboard onNavegar={navegarComFiltro} />
  }

  return (
    <ConfigProvider locale={ptBR}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider theme="dark">
          <div style={{ padding: '16px', color: 'white' }}>
            <Title level={5} style={{ color: 'white', margin: 0 }}>
              Concessões
            </Title>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[paginaAtual === 'detalhe' ? 'obrigacoes' : paginaAtual]}
            items={menuItems}
            onClick={onMenuClick}
          />
        </Sider>
        <Layout>
          <Header style={{ background: '#fff', padding: '0 24px' }}>
            <Title level={4} style={{ margin: '16px 0' }}>
              {tituloPagina()}
            </Title>
          </Header>
          <Content style={{ margin: '24px', background: '#fff', padding: '24px', borderRadius: '8px' }}>
            {renderPagina()}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}

export default App
