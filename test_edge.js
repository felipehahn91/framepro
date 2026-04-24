const url = "https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/og-proxy?type=orcamento&id=3e8f4825-a7f2-4129-929b-646cc32054b9";
fetch(url)
  .then(res => res.text())
  .then(text => console.log(text))
  .catch(err => console.error(err));
