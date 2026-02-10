# Design System et Conventions CSS

## Principe fondamental

**Ne jamais écrire de classes couleur en dur** dans les composants. Toujours utiliser les tokens sémantiques définis dans `index.css` et `tailwind.config.ts`.

---

## Tokens sémantiques

### Couleurs de base
| Token | Usage |
|-------|-------|
| `--background` | Fond principal de l'application |
| `--foreground` | Texte principal |
| `--muted` | Fonds atténués |
| `--muted-foreground` | Texte secondaire, labels |
| `--border` | Bordures standard |
| `--input` | Bordures d'inputs |
| `--ring` | Focus ring |

### Couleurs d'action
| Token | Usage |
|-------|-------|
| `--primary` | Actions principales, CTA |
| `--primary-foreground` | Texte sur primary |
| `--secondary` | Actions secondaires |
| `--accent` | Mise en valeur |
| `--destructive` | Suppression, erreurs critiques |

### Couleurs fonctionnelles
| Token | Usage |
|-------|-------|
| `--success` | Statut validé, confirmation |
| `--warning` | Attention, en attente |
| `--info` | Information, liens |
| `--premium` | Fonctionnalités premium, Stripe |

### Couleurs storefront
| Token | Usage |
|-------|-------|
| `--storefront-dark` | Fond sombre des pages publiques |
| `--storefront-darker` | Fond encore plus sombre |
| `--storefront-card` | Cartes sur fond sombre |

### Gradients
| Classe | Usage |
|--------|-------|
| `bg-gradient-premium` | Gradient premium (indigo → purple) |
| `bg-gradient-to-br from-success/10` | Fond de statut validé |

---

## Conventions

### ✅ Correct
```tsx
<div className="bg-background text-foreground border-border">
<p className="text-muted-foreground">Texte secondaire</p>
<span className="text-success">Validé</span>
<button className="bg-primary text-primary-foreground">Action</button>
```

### ❌ Interdit
```tsx
<div className="bg-white text-black border-gray-200">
<p className="text-gray-500">Texte secondaire</p>
<span className="text-green-500">Validé</span>
<button className="bg-blue-600 text-white">Action</button>
```

### Exception : `text-white` autorisé sur
- Boutons avec gradient (`bg-gradient-premium`)
- Icônes sur fond coloré
- Badges sur fond sombre

### Exclusions du design system
- **CongressFlyer.tsx** : Couleurs fixes pour impression physique
- **Branding tiers** : WhatsApp (vert), Facebook (bleu), etc.
- **Charts Recharts** : Couleurs de séries distinctes
- **Étoiles de notation** : Amber/yellow préservé

---

## Format des couleurs

Toutes les couleurs dans `index.css` et `tailwind.config.ts` doivent être en **HSL**.
