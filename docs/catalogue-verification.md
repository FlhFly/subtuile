# Vérification du catalogue

Rapport généré le 2026-09-16 par `scripts/verifier-catalogue.cjs` — catalogue v11, tarifs indicatifs au 2026-09-16.

## Résumé

- 79 services, 233 formules ; 7 services sans formule ; 74 services revus manuellement (`verifieLe`).
- Structure : aucun problème.
- Réseau : 74 adresses testées, 49 répondent 2xx ; les 403 / 429 viennent le plus souvent d'une protection anti-robot et se vérifient à la main.

## Services

| Service | Catégorie | Formules | Adresse de gestion | Réponse | Vérifié le |
|---|---|---|---|---|---|
| Netflix ★ (`netflix`) | streaming | 3 | <https://www.netflix.com/cancelplan> | injoignable (ECONNRESET) | 2026-09-14 |
| Amazon Prime ★ (`prime`) | streaming | 2 | <https://www.amazon.fr/mc> | injoignable (ECONNRESET) | 2026-09-14 |
| Disney+ ★ (`disney`) | streaming | 5 | <https://www.disneyplus.com/account> | OK | 2026-09-14 |
| HBO Max (`hbomax`) | streaming | 6 | <https://hbomax.com/account> | injoignable (ECONNRESET) | 2026-09-14 |
| Apple TV+ (`appletv`) | streaming | 1 | — | — (lien profond) | 2026-09-14 |
| Canal+ ★ (`canal`) | streaming | 4 | <https://client.canalplus.com> | OK | 2026-09-14 |
| Paramount+ (`paramount`) | streaming | 4 | <https://paramountplus.com/account> | HTTP 403 (anti-robot probable) | 2026-09-14 |
| Crunchyroll (`crunchy`) | streaming | 4 | <https://www.crunchyroll.com/fr/account/membership> | HTTP 403 (anti-robot probable) | 2026-09-14 |
| ADN (`adn`) | streaming | 3 | <https://animationdigitalnetwork.com> | injoignable (ECONNRESET) | 2026-09-14 |
| YouTube Premium ★ (`youtube`) | streaming | 4 | <https://youtube.com/paid_memberships> | OK, redirigé vers accounts.google.com | 2026-09-14 |
| Molotov (`molotov`) | streaming | 4 | <https://www.molotov.tv/account> | OK | 2026-09-14 |
| DAZN (`dazn`) | streaming | 2 | <https://www.dazn.com/fr-FR/myaccount> | OK | 2026-09-14 |
| beIN Sports (`bein`) | streaming | 1 | <https://www.beinsports.com/fr-fr/mon-compte> | OK | 2026-09-14 |
| Spotify ★ (`spotify`) | musique | 4 | <https://www.spotify.com/account/subscription> | OK | 2026-09-14 |
| Deezer ★ (`deezer`) | musique | 5 | <https://deezer.com/account> | OK | 2026-09-14 |
| Apple Music (`applemusic`) | musique | 3 | — | — (lien profond) | 2026-09-14 |
| Amazon Music (`amazonmusic`) | musique | 3 | <https://amazon.fr/music/settings> | OK | 2026-09-14 |
| YouTube Music (`ytmusic`) | musique | 0 | <https://music.youtube.com/paid_memberships> | OK | — |
| Tidal (`tidal`) | musique | 2 | <https://tidal.com/account> | HTTP 403 (anti-robot probable) | 2026-09-14 |
| Audible (`audible`) | musique | 1 | <https://audible.fr/account> | OK, redirigé vers amazon.fr | 2026-09-14 |
| Claude ★ (`claude`) | ia | 4 | <https://claude.ai/settings/billing> | OK | 2026-09-14 |
| ChatGPT ★ (`chatgpt`) | ia | 4 | <https://chatgpt.com/#settings/Subscription> | OK | 2026-09-14 |
| Gemini / Google AI (`gemini`) | ia | 1 | <https://one.google.com/plans> | OK | 2026-09-14 |
| Copilot Pro (`copilot`) | ia | 1 | <https://account.microsoft.com/services> | injoignable (fetch failed) | 2026-09-14 |
| GitHub Copilot (`ghcopilot`) | ia | 2 | <https://github.com/settings/billing/summary> | OK | 2026-09-14 |
| Midjourney (`midjourney`) | ia | 8 | <https://midjourney.com/account> | HTTP 403 (anti-robot probable) | 2026-09-14 |
| Perplexity (`perplexity`) | ia | 3 | <https://perplexity.ai/settings> | HTTP 403 (anti-robot probable) | 2026-09-14 |
| Le Chat Mistral (`mistral`) | ia | 1 | <https://chat.mistral.ai> | HTTP 403 (anti-robot probable) | 2026-09-14 |
| iCloud+ ★ (`icloud`) | cloud | 5 | — | — (lien profond) | 2026-09-14 |
| Google One (`googleone`) | cloud | 3 | <https://one.google.com/plans> | OK | 2026-09-14 |
| Dropbox ★ (`dropbox`) | cloud | 2 | <https://www.dropbox.com/account/plan> | OK | 2026-09-14 |
| Microsoft 365 (`ms365`) | cloud | 6 | <https://account.microsoft.com/services> | injoignable (fetch failed) | 2026-09-14 |
| kDrive Infomaniak (`kdrive`) | cloud | 1 | <https://manager.infomaniak.com> | OK, redirigé vers login.infomaniak.com | 2026-09-14 |
| pCloud (`pcloud`) | cloud | 3 | <https://my.pcloud.com> | OK | 2026-09-14 |
| Adobe Creative Cloud (`adobe`) | productivite | 4 | <https://account.adobe.com/plans> | OK | 2026-09-14 |
| Canva Pro (`canva`) | productivite | 2 | <https://canva.com/settings/billing> | HTTP 403 (anti-robot probable) | 2026-09-14 |
| Notion (`notion`) | productivite | 2 | <https://notion.so> | OK, redirigé vers notion.com | 2026-09-14 |
| 1Password (`onepass`) | productivite | 2 | <https://start.1password.com> | OK | 2026-09-14 |
| Bitwarden (`bitwarden`) | productivite | 2 | <https://vault.bitwarden.com> | OK | 2026-09-14 |
| Dashlane (`dashlane`) | productivite | 1 | <https://app.dashlane.com> | HTTP 403 (anti-robot probable) | — |
| LinkedIn Premium (`linkedin`) | productivite | 2 | <https://linkedin.com/premium/manage> | OK | — |
| Strava ★ (`strava`) | sport | 4 | <https://www.strava.com/account> | injoignable (ECONNRESET) | 2026-09-14 |
| Basic-Fit (`basicfit`) | sport | 6 | <https://my.basic-fit.com> | OK, redirigé vers login.basic-fit.com | 2026-09-16 |
| Fitness Park (`fitnesspark`) | sport | 0 | <https://www.fitnesspark.fr> | OK | — |
| Zwift (`zwift`) | sport | 2 | <https://my.zwift.com> | OK | 2026-09-16 |
| TrainingPeaks (`trainingpeaks`) | sport | 2 | <https://app.trainingpeaks.com> | OK | 2026-09-16 |
| Komoot Premium (`komoot`) | sport | 2 | <https://www.komoot.com/account> | OK | 2026-09-16 |
| AllTrails (`alltrails`) | sport | 2 | <https://www.alltrails.com> | OK | 2026-09-16 |
| Garmin Connect+ (`garmin`) | sport | 2 | <https://connect.garmin.com> | OK | 2026-09-16 |
| Apple Fitness+ (`applefit`) | sport | 2 | — | — (lien profond) | 2026-09-16 |
| Le Monde (`lemonde`) | presse | 3 | <https://moncompte.lemonde.fr> | OK, redirigé vers secure.lemonde.fr | 2026-09-16 |
| L’Équipe (`lequipe`) | presse | 3 | <https://lequipe.fr> | OK | — |
| Mediapart (`mediapart`) | presse | 4 | <https://moncompte.mediapart.fr> | OK | 2026-09-16 |
| Les Échos (`lesechos`) | presse | 2 | <https://lesechos.fr> | OK | 2026-09-16 |
| Cafeyn (`cafeyn`) | presse | 3 | <https://www.cafeyn.co/fr/account> | OK | 2026-09-16 |
| PlayStation Plus (`psplus`) | gaming | 9 | <https://www.playstation.com/fr-fr/support/subscriptions/> | OK | 2026-09-16 |
| Xbox Game Pass (`gamepass`) | gaming | 4 | <https://account.microsoft.com/services> | injoignable (fetch failed) | 2026-09-16 |
| Nintendo Switch Online (`nintendo`) | gaming | 6 | <https://accounts.nintendo.com> | OK | 2026-09-16 |
| GeForce Now (`geforce`) | gaming | 4 | <https://play.geforcenow.com> | OK | 2026-09-16 |
| Apple Arcade (`arcade`) | gaming | 2 | — | — (lien profond) | 2026-09-16 |
| Twitch (`twitch`) | gaming | 4 | <https://twitch.tv/subscriptions> | OK | 2026-09-16 |
| NordVPN (`nordvpn`) | securite | 9 | <https://my.nordaccount.com> | HTTP 403 (anti-robot probable) | 2026-09-16 |
| Proton (`proton`) | securite | 8 | <https://account.proton.me> | OK | 2026-09-16 |
| Surfshark (`surfshark`) | securite | 4 | <https://my.surfshark.com> | HTTP 403 (anti-robot probable) | 2026-09-16 |
| ExpressVPN (`expressvpn`) | securite | 6 | <https://www.expressvpn.com/subscriptions> | OK | 2026-09-16 |
| Uber One (`uberone`) | vie_courante | 2 | — | — (espace_client) | 2026-09-16 |
| Deliveroo Plus (`deliveroo`) | vie_courante | 1 | <https://deliveroo.fr/fr/account> | HTTP 403 (anti-robot probable) | 2026-09-16 |
| Fnac+ (`fnac`) | vie_courante | 1 | <https://www.fnac.com/fnacplus> | HTTP 403 (anti-robot probable) | 2026-09-16 |
| Télépéage Ulys (`ulys`) | vie_courante | 4 | <https://ulys.com> | OK | 2026-09-16 |
| Babbel (`babbel`) | vie_courante | 4 | <https://my.babbel.com> | injoignable (fetch failed) | 2026-09-16 |
| Duolingo Super (`duolingo`) | vie_courante | 2 | <https://www.duolingo.com/settings/super> | OK | 2026-09-16 |
| Headspace (`headspace`) | vie_courante | 2 | <https://my.headspace.com> | OK | 2026-09-16 |
| Calm (`calm`) | vie_courante | 1 | <https://www.calm.com> | injoignable (ECONNRESET) | 2026-09-16 |
| Petit BamBou (`petitbambou`) | vie_courante | 3 | <https://www.petitbambou.com/fr/subscriptions> | OK | 2026-09-16 |
| EDF (`edf`) | vie_courante | 0 | <https://particulier.edf.fr/fr/accueil/espace-client.html> | OK | 2026-09-16 |
| Engie (`engie`) | vie_courante | 0 | <https://particuliers.engie.fr/espace-client.html> | OK | 2026-09-16 |
| TotalEnergies (`totalenergies`) | vie_courante | 0 | <https://www.totalenergies.fr/clients/espace-client> | HTTP 403 (anti-robot probable) | 2026-09-16 |
| Veolia Eau (`veolia`) | vie_courante | 0 | <https://www.eau.veolia.fr> | injoignable (ECONNRESET) | 2026-09-16 |
| MAIF (`maif`) | vie_courante | 0 | <https://www.maif.fr/espace-personnel> | OK | 2026-09-16 |

## Liens profonds (magasins)

- <https://play.google.com/store/account/subscriptions> : OK, redirigé vers accounts.google.com
