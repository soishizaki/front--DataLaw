export const CHAVE_NOMES_ANEXOS = 'anexos_nomes'

const CHAVE_MAP = {
  'Anexo 1 - Regulamento da Concessão': 'anexo1',
  'Anexo 2 - Plano de Exploração Aeroportuária (PEA)': 'anexo2',
  'Anexo 3': 'anexo3',
  'Anexo 4 - Plano de Transferência Operacional (PTO)': 'anexo4',
  'Anexo 5 - Tarifas Aeroportuárias': 'anexo5',
  'Anexo 6 - Contrato de Administração de Contas': 'anexo6',
  'Anexo 7': 'anexo7',
  'Anexo 8 - Termo de Aceitação e Permissão de Uso de Ativos': 'anexo8',
  'Anexo 9': 'anexo9',
  'Anexo 10': 'anexo10',
  'Anexo 11': 'anexo11',
  'Anexo 12': 'anexo12',
  'Anexo 13': 'anexo13',
  'Anexo 14': 'anexo14',
  'Anexo 15': 'anexo15',
  'Anexo 16': 'anexo16',
  'Anexo 17 - Caderno de Penalidades': 'anexo17',
  'Anexo 18': 'anexo18',
}

export function getLabelDocumento(documentValue) {
  const chave = CHAVE_MAP[documentValue]
  if (!chave) return documentValue
  try {
    const nomes = JSON.parse(localStorage.getItem(CHAVE_NOMES_ANEXOS)) || {}
    return nomes[chave] || documentValue
  } catch {
    return documentValue
  }
}
