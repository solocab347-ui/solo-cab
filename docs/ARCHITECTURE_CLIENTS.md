# Types de Clients et Acquisition

## Deux types de clients

### Client Exclusif (`is_exclusive = true`)
- Capturé via **QR code ou NFC** d'un chauffeur spécifique
- Lié à un seul chauffeur
- Ne peut pas voir les autres chauffeurs
- Trigger `auto_assign_favorite_driver_trigger` assure la cohérence :
  - Si `is_exclusive = true` et `favorite_driver_id` vide → assignation automatique via `driver_id`, `qr_code_id`, ou premier élément de `driver_ids`

### Client Libre (`is_exclusive = false`)
- Inscription via la **vitrine publique** (storefront)
- Peut réserver chez plusieurs chauffeurs
- Peut naviguer/parcourir les profils chauffeurs

---

## Requêtes d'association

```javascript
// Vérifier l'association d'un client à un chauffeur
$or: [{ driver_id: id }, { driver_ids: id }]
```

---

## Guest Bookings

- Les données de réservation sont conservées pour conversion vers inscription
- `client_id` nullable dans les tables `courses`, `devis`, `factures`
- Permet aux chauffeurs de créer des courses/devis pour des clients non enregistrés

---

## Partage de courses

Quand un chauffeur partage une course avec un autre chauffeur :
- Le receveur **voit** la course
- Le receveur **ne peut pas** ajouter le client à son roster
- Le receveur **ne peut pas** être ajouté comme chauffeur du client
- **Propriété du client préservée** pour le chauffeur d'origine

---

## Tunnel d'acquisition

```
Scan (NFC/QR) → Découverte des services → Inscription → Fidélisation
```

### Outils d'acquisition
- **Plaque NFC** physique (commandée à l'onboarding)
- **QR Code** du dashboard (disponible immédiatement)
- **Vitrine publique** du chauffeur

### Objectifs d'acquisition
- Cibles mensuelles configurables : 1 à 50 nouveaux clients
- Visualiseur de tunnel de conversion
- Taux de rétention estimé : **35%** (scans → clients fidèles)
- Aide à planifier la transition vers l'indépendance
