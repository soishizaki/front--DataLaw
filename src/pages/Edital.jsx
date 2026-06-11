import { Typography } from 'antd'

const { Title } = Typography

export default function Edital() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Edital</Title>
      </div>
      <iframe
        src="/edital.pdf"
        title="Edital"
        style={{ flex: 1, width: '100%', border: 'none', borderRadius: 8, minHeight: 700 }}
      />
    </div>
  )
}
