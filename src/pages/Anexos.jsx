import { Tabs } from 'antd'

const ANEXOS = [
  { key: 'anexo1',  label: 'Anexo 1 – Regulamento',  src: '/anexo1.pdf'  },
  { key: 'anexo2',  label: 'Anexo 2 – PEA',           src: '/anexo2.pdf'  },
  { key: 'anexo3',  label: 'Anexo 3',                  src: '/anexo3.pdf'  },
  { key: 'anexo4',  label: 'Anexo 4 – PTO',            src: '/anexo4.pdf'  },
  { key: 'anexo5',  label: 'Anexo 5 – Tarifas',        src: '/anexo5.pdf'  },
  { key: 'anexo6',  label: 'Anexo 6 – Adm. Contas',    src: '/anexo6.pdf'  },
  { key: 'anexo7',  label: 'Anexo 7',                  src: '/anexo7.pdf'  },
  { key: 'anexo8',  label: 'Anexo 8 – Aceitação',      src: '/anexo8.pdf'  },
  { key: 'anexo9',  label: 'Anexo 9',                  src: '/anexo9.pdf'  },
  { key: 'anexo10', label: 'Anexo 10',                 src: '/anexo10.pdf' },
  { key: 'anexo11', label: 'Anexo 11',                 src: '/anexo11.pdf' },
  { key: 'anexo12', label: 'Anexo 12',                 src: '/anexo12.pdf' },
  { key: 'anexo13', label: 'Anexo 13',                 src: '/anexo13.pdf' },
  { key: 'anexo14', label: 'Anexo 14',                 src: '/anexo14.pdf' },
  { key: 'anexo15', label: 'Anexo 15',                 src: '/anexo15.pdf' },
  { key: 'anexo16', label: 'Anexo 16',                 src: '/anexo16.pdf' },
  { key: 'anexo17', label: 'Anexo 17 – Penalidades',   src: '/anexo17.pdf' },
  { key: 'anexo18', label: 'Anexo 18',                 src: '/anexo18.pdf' },
]

export default function Anexos() {
  return (
    <Tabs
      defaultActiveKey="anexo1"
      destroyInactiveTabPane
      items={ANEXOS.map(a => ({
        key: a.key,
        label: a.label,
        children: (
          <iframe
            key={a.key}
            src={a.src}
            title={a.label}
            style={{ width: '100%', border: 'none', borderRadius: 8, minHeight: 700 }}
          />
        ),
      }))}
    />
  )
}
