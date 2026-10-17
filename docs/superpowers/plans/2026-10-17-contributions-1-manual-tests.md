# Contributions plan 1 : tests manuels

## Avant la mise en production

- [ ] Domaine `laciotatnature.fr` vérifié chez Resend (enregistrements SPF et DKIM).
- [ ] Les cinq variables sont définies sur Vercel : `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAIL`, `EMAIL_FROM`, `RESEND_API_KEY`.
- [ ] La boîte `contact@laciotatnature.fr` (`CONTACT_EMAIL`) existe et est relevée.

## Prérequis en local

Dans `.env.local` : `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3000`, `ADMIN_EMAIL`, `EMAIL_FROM`. `RESEND_API_KEY` est facultative : sans elle, les emails s'affichent dans le terminal de `pnpm dev`. La migration doit être appliquée à la base. L'admin (`/admin`) est protégé par une authentification Basic : saisir le mot de passe `ADMIN_PASSWORD` (nom d'utilisateur libre). `ADMIN_EMAIL` sert uniquement à recevoir les notifications.

## Scénarios

1. **Astuce déconnecté.** Sur une fiche lieu, cliquer « Ajouter une astuce », remplir le formulaire (nom, email, texte, charte) et envoyer. Attendu : `/connexion/verifier` affiche « Dernière étape : cliquez sur le lien envoyé à x•••@domaine… » ; le terminal contient l'email « Confirmez votre email pour envoyer votre contribution ». Ouvrir le lien : retour sur la fiche avec la bannière « Merci ! Votre contribution est en relecture… » et la boîte « En relecture · visible par vous seul ». L'admin reçoit « Nouvelle contribution à relire — Astuce · {lieu} ».
2. **Autre navigateur.** Refaire le 1, mais ouvrir le lien dans une fenêtre privée. Attendu : la contribution est bien rattachée, la bannière s'affiche dans cette fenêtre.
2b. **Lien expiré, connexion depuis `/compte`.** Dans un navigateur, déconnecté, envoyer une astuce et NE PAS cliquer le lien (attendre plus de 15 minutes qu'il expire, ou simplement l'ignorer). Dans un autre navigateur (ou une fenêtre privée), aller sur `/compte`, saisir le même email, « Recevoir le lien », puis cliquer le lien reçu. Attendu : connecté sur `/compte` ; sur la fiche du lieu, la boîte « En relecture · visible par vous seul » contient l'astuce ; l'admin reçoit « Nouvelle contribution à relire — Astuce · {lieu} ». Se déconnecter puis rouvrir ce même lien `/compte` : arrivée sur `/compte?erreur=lien` avec « Ce lien a expiré ou a déjà servi. Demandez-en un nouveau. ».
3a. **Lien déjà utilisé.** Déconnecté, envoyer une astuce, cliquer une fois sur le lien de l'email (la contribution part en relecture), puis rouvrir ce même lien. Attendu : arrivée sur `/connexion/verifier?erreur=lien` avec « Ce lien a expiré ou a déjà servi. Demandez-en un nouveau. ».
3b. **Renvoi.** Déconnecté, avec un email qui n'a pas encore de compte, envoyer une astuce SANS cliquer le lien. Sur `/connexion/verifier`, attendre une minute puis cliquer « Renvoyer le lien ». Attendu : un nouvel email dans le terminal. Un second clic dans les 60 s affiche « Patientez une minute avant de redemander un lien. ». Ensuite, cliquer le dernier lien reçu pour confirmer : sur `/compte`, le nom affiché est celui saisi dans le formulaire d'astuce (jamais vide). Revenir sur `/connexion/verifier` et cliquer « Renvoyer le lien ». Attendu : « Session expirée, recommencez depuis le formulaire. » (le renvoi n'est possible que tant qu'une contribution non confirmée existe).
4. **Redirection ouverte.** Connecté, sans contribution envoyée dans les 15 dernières minutes, ouvrir `/connexion/confirmer?next=//example.com`. Attendu : arrivée sur `/` sans bannière (jamais sur example.com).
5. **Astuce connecté.** Connecté, ajouter une astuce. Attendu : retour direct sur la fiche avec la bannière ; le formulaire indique « Publié sous le nom … ».
6. **Compte sans nom.** Créer un compte depuis `/compte` (« Recevoir le lien », sans nom), puis ouvrir le formulaire d'astuce. Attendu : le formulaire demande un nom.
7. **Honeypot.** Dans les devtools, repérer `input[name="website"]` (champ caché), lui donner une valeur (ex. `$0.value = "x"` après l'avoir sélectionné), puis envoyer le formulaire. Attendu : redirection normale, aucune ligne créée (vérifier dans `/admin/contributions` : rien de nouveau).
8. **Plafond.** Le plafond est de 10 contributions en relecture par compte (par email si déconnecté). Connecté avec un même compte, envoyer 10 astuces sans les traiter dans l'admin, puis une 11e. Attendu : « Vous avez déjà 10 contributions en relecture. Merci de patienter un peu. »
9. **Modération.** Sur `/admin/contributions` (lien « Contributions (n) » du menu admin) : modifier le texte et le thème, ajouter un commentaire, « Publier ». Attendu : l'astuce apparaît sur la fiche avec « {nom} · {commune} · {mois année} » ; l'auteur reçoit « Votre astuce sur {lieu} est en ligne, merci ! ». Pour une autre : saisir un motif, « Refuser ». Attendu : l'email de refus cite le motif.
10. **Existant et vide.** Les astuces qui existaient avant cette fonctionnalité (sans auteur) affichent « Alexandre · La Ciotat ». Un lieu sans astuce affiche « Aucun conseil pour l'instant. Vous connaissez ce lieu ? Partagez la première astuce. »
11. **Compte.** Sur `/compte` (« Mon compte ») : modifier le nom, « Enregistrer » ; la fiche affiche le nouveau nom. « Se déconnecter » ramène à la déconnexion. Se reconnecter, « Supprimer mon compte » : l'astuce publiée reste signée « Un ancien contributeur », les contributions en relecture disparaissent. L'avatar apparaît dans l'en-tête quand on est connecté.
12. **Pages légales.** `/mentions-legales` et `/confidentialite` s'affichent et figurent dans `/sitemap.xml`.
