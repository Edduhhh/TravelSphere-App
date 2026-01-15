# 🐷 Porcos Bravos - Assets Guide

## Pig Images Naming Convention

### Default Pig
- `pig_default.png` - Viking pigs (base fallback)

### City-Specific Pigs
Format: `pig_[city_name].png`

Examples:
- `pig_paris.png`
- `pig_barcelona.png`
- `pig_amsterdam.png`
- `pig_berlin.png`

### Angry/Rude Variants (Optional)
Format: `pig_[city_name]_angry.png` or `pig_[city_name]_rude.gif`

These will be used during the 3-second elimination animation.

## How It Works

1. When a city is eliminated (e.g., "Paris"), the app tries to load `/assets/pigs/pig_paris.png`
2. If the file doesn't exist, it falls back to `/assets/pigs/pig_default.png` (Viking pigs)
3. During elimination animation, the image can transition to angry variant if available

## Directory Structure

```
public/
└── assets/
    └── pigs/
        ├── pig_default.png         ← REQUIRED (Viking pigs)
        ├── pig_paris.png          ← Optional
        ├── pig_paris_angry.png    ← Optional
        ├── pig_barcelona.png      ← Optional
        └── ...
```

## Adding New City Pigs

1. Create image with transparent background
2. Name it according to convention (lowercase, underscores for spaces)
3. Save to `/public/assets/pigs/`
4. Restart dev server if needed

The system will automatically detect and use city-specific pigs!
