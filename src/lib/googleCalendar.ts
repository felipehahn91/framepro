import { supabase } from "@/integrations/supabase/client";

let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * Busca um Access Token fresco utilizando o Refresh Token salvo via Edge Function
 */
export const getFreshGoogleToken = async (): Promise<string> => {
  // Retorna o cache se o token ainda for válido (válido por 50 min)
  if (cachedToken && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado");

  const response = await fetch('https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/refresh-google-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao renovar token do Google');
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiryTime = Date.now() + (50 * 60 * 1000); // Salva em memória por 50 minutos
  
  return data.access_token;
};

export const listUserCalendars = async () => {
  const token = await getFreshGoogleToken();
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) throw new Error('Erro ao carregar listas de calendários');
  const data = await response.json();
  return data.items || [];
};

export const listGoogleEvents = async (calendarId: string, timeMin: string, timeMax: string) => {
  const token = await getFreshGoogleToken();
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.append('timeMin', timeMin);
  url.searchParams.append('timeMax', timeMax);
  url.searchParams.append('singleEvents', 'true');
  url.searchParams.append('orderBy', 'startTime');

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) throw new Error('Erro ao carregar eventos do Google');
  const data = await response.json();
  return data.items || [];
};

export const createGoogleCalendarEvent = async (
  calendarId: string,
  eventData: {
    title: string;
    description?: string;
    date: Date;
    time?: string;
    createMeet?: boolean;
  }
) => {
  const token = await getFreshGoogleToken();
  let start, end;

  if (eventData.time) {
    const [hours, minutes] = eventData.time.split(':');
    const startDate = new Date(eventData.date);
    startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1);

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

  if (eventData.createMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' }
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
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error('Erro ao criar evento no Google');
  return response.json();
};