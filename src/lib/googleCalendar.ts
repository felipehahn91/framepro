export const syncEventToGoogle = async (event: any, providerToken: string) => {
  // Formatando a data de início e fim para "Dia Inteiro" no Google
  const startDate = event.date.toISOString().split('T')[0];
  const endDateObj = new Date(event.date);
  endDateObj.setDate(endDateObj.getDate() + 1);
  const endDate = endDateObj.toISOString().split('T')[0];

  let description = `Tipo: ${event.type}\nStatus: ${event.status}`;
  if (event.amount) description += `\nValor: R$ ${event.amount}`;
  if (event.description) description += `\nDetalhes: ${event.description}`;
  description += `\n\n--- Gerado por Frame Pro CRM ---`;

  const googleEvent = {
    summary: event.title,
    description: description,
    start: { date: startDate },
    end: { date: endDate },
    colorId: event.type === 'Pagamento' ? '11' : event.type === 'Tarefa' ? '6' : '9' // Cores (11: Vermelho, 6: Laranja, 9: Azul)
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${providerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(googleEvent)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Erro ao sincronizar com Google');
  }

  return response.json();
};