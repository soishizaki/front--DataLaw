import { Typography } from 'antd'

const { Title } = Typography

export default function Contrato() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Contrato de Concessão</Title>
      </div>
      <iframe
        src="/contrato.pdf"
        title="Contrato ARTESP"
        style={{ flex: 1, width: '100%', border: 'none', borderRadius: 8, minHeight: 700 }}
      />
    </div>
  )
}
