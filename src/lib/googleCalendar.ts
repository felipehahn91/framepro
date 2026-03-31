export const listUserCalendars = async (providerToken: string) => {
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      'Authorization': `Bearer ${providerToken}`,
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Erro ao carregar listas de calendários');
  }

  const data = await response.json();
  return data.items || [];
};

export const listGoogleEvents = async (providerToken: string, calendarId: string, timeMin: string, timeMax: string) => {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.append('timeMin', timeMin);
  url.searchParams.append('timeMax', timeMax);
  url.searchParams.append('singleEvents', 'true');
  url.searchParams.append('orderBy', 'startTime');

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${providerToken}`,
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Erro ao carregar eventos do Google');
  }

  const data = await response.json();
  return data.items || [];
};

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
    colorId: event.type === 'Pagamento' ? '11' : event.type === 'Tarefa' ? '6' : '9' 
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

export const createGoogleCalendarEvent = async (
  providerToken: string,
  calendarId: string,
  eventData: {
    title: string;
    description?: string;
    date: Date;
    time?: string; // Formato HH:mm
    createMeet?: boolean;
  }
) => {
  let start, end;

  if (eventData.time) {
    const [hours, minutes] = eventData.time.split(':');
    const startDate = new Date(eventData.date);
    startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1); // Padrão: 1 hora de duração

    start = { dateTime: startDate.toISOString() };
    end = { dateTime: endDate.toISOString() };
  } else {
    const startDateStr = eventData.date.toISOString().split('T')[0];
    const endDateObj = new Date(eventData.date);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const endDateStr = endDateObj.toISOString().split('T')[0];

    start = { date: startDateStr };
    end = { date: endDateStr };
  }

  const body: any = {
    summary: eventData.title,
    description: eventData.description || '',
    start,
    end,
  };

  // Se o usuário pediu Meet, adicionamos os dados de conferência
  if (eventData.createMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    };
  }

  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  if (eventData.createMeet) {
    url.searchParams.append('conferenceDataVersion', '1');
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${providerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Erro ao criar evento no Google');
  }

  return response.json();
};