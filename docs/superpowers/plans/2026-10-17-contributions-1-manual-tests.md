# Contributions plan 1 : tests manuels

## Avant la mise en production

- [ ] Domaine `laciotatnature.fr` vérifié chez Resend (enregistrements SPF et DKIM).
- [ ] Les cinq variables sont définies sur Vercel : `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAIL`, `EMAIL_FROM`, `RESEND_API_KEY`.
- [ ] La boîte `contact@laciotatnature.fr` (`CONTACT_EMAIL`) existe et est relevée.

## Prérequis en local

Dans `.env.local` : `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3000`, `ADMIN_EMAIL`, `EMAIL_FROM`. `RESEND_API_KEY` est facultative : sans elle, les emails s'affichent dans le terminal de `pnpm dev`. La migration doit être appliquée à la base. Pour l'admin, être connecté avec l'email `ADMIN_EMAIL`.

## Scénarios

1. **Astuce déconnecté.** Sur une fiche lieu, cliquer « Ajouter une astuce », remplir le formulaire (nom, email, texte, charte) et envoyer. Attendu : `/connexion/verifier` affiche « Dernière étape : cliquez sur le lien envoyé à x•••@domaine… » ; le terminal contient l'email « Confirmez votre email pour envoyer votre contribution ». Ouvrir le lien : retour sur la fiche avec la bannière « Merci ! Votre contribution est en relecture… » et la boîte « En relecture · visible par vous seul ». L'admin reçoit « Nouvelle contribution à relire — Astuce · {lieu} ».
2. **Autre navigateur.** Refaire le 1, mais ouvrir le lien dans une fenêtre privée. Attendu : la contribution est bien rattachée, la bannière s'affiche dans cette fenêtre.
3. **Lien invalide et renvoi.** Utiliser un lien déjà servi (ou expiré) : on arrive sur `/connexion/verifier?erreur=lien` avec « Ce lien a expiré ou a déjà servi. Demandez-en un nouveau. ». Le renvoi ne fonctionne que si une contribution non confirmée existe : soumettre une astuce, ne pas cliquer le lien, puis « Renvoyer le lien » sur la page de vérification. Attendu : nouvel email dans le terminal ; un second clic dans les 60 s affiche « Patientez une minute avant de redemander un lien. ». Après confirmation de la contribution, « Renvoyer le lien » affiche « Session expirée, recommencez depuis le formulaire. ».
4. **Redirection ouverte.** Connecté, ouvrir `/connexion/confirmer?next=//example.com`. Attendu : arrivée sur `/?contribution=envoyee` (jamais sur example.com).
5. **Astuce connecté.** Connecté, ajouter une astuce. Attendu : retour direct sur la fiche avec la bannière ; le formulaire indique « Publié sous le nom … ».
6. **Compte sans nom.** Créer un compte depuis `/compte` (« Recevoir le lien », sans nom), puis ouvrir le formulaire d'astuce. Attendu : le formulaire demande un nom.
7. **Honeypot.** Dans les devtools, remplir le champ caché `website` puis envoyer. Attendu : redirection normale, aucune ligne créée (vérifier dans `/admin/contributions` : rien de nouveau).
8. **Plafond.** Avoir 10 astuces en relecture, puis en envoyer une 11e. Attendu : « Vous avez déjà 10 contributions en relecture. Merci de patienter un peu. »
9. **Modération.** Sur `/admin/contributions` (lien « Contributions (n) » du menu admin) : modifier le texte et le thème, ajouter un commentaire, « Publier ». Attendu : l'astuce apparaît sur la fiche avec « {nom} · {commune} · {mois année} » ; l'auteur reçoit « Votre astuce sur {lieu} est en ligne, merci ! ». Pour une autre : saisir un motif, « Refuser ». Attendu : l'email de refus cite le motif.
10. **Existant et vide.** Les astuces existantes affichent « Alexandre · La Ciotat ». Un lieu sans astuce affiche « Aucun conseil pour l'instant. Vous connaissez ce lieu ? Partagez la première astuce. »
11. **Compte.** Sur `/compte` (« Mon compte ») : modifier le nom, « Enregistrer » ; la fiche affiche le nouveau nom. « Se déconnecter » ramène à la déconnexion. Se reconnecter, « Supprimer mon compte » : l'astuce publiée reste signée « Un ancien contributeur », les contributions en relecture disparaissent. L'avatar apparaît dans l'en-tête quand on est connecté.
12. **Pages légales.** `/mentions-legales` et `/confidentialite` s'affichent et figurent dans `/sitemap.xml`.
