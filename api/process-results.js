export default async function handler(req, res) {
  const name = req.query.name || "du";

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
body {
  margin: 0;
  background: #f3f3e6;
  font-family: Arial, Helvetica, sans-serif;
  color: #333;
}

.wrapper {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
}

.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 35px;
}

.header {
  background: #2d5146;
  color: #ffffff;
  text-align: center;
  padding: 30px 20px;
  border-radius: 12px;
}

h2 {
  color: #3dadff;
  margin-top: 30px;
}

.cta-button {
  display: inline-block;
  background-color: #2d5146;
  color: #3dadff;
  padding: 14px 26px;
  border-radius: 10px;
  text-decoration: none;
  margin-top: 20px;
}
</style>
</head>

<body>

<div class="wrapper">
  <div class="card">

    <div class="header">
      <h1>Hallo ${name}</h1>
    </div>

    <h2>Deine persönliche Auswertung</h2>
    <p>Deine individuelle Analyse wird hier dargestellt.</p>

    <h2>Deine Meal Prep Routine</h2>
    <p>Hier erfährst du, welche Anforderungen deine Routine erfüllen sollte.</p>

    <a class="cta-button" href="#">
      Kostenloses Orientierungsgespräch buchen
    </a>

  </div>
</div>

</body>
</html>
`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}
