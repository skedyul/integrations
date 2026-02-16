# BFT Integration

Body Fit Training website scraper integration for syncing gym data.

## Features

- **Website Scraping**: Extracts data from BFT club pages
- **Package Sync**: Imports membership packages and intro offers
- **Class Sync**: Imports class types and schedules
- **Business Details**: Extracts contact information
- **Prospect Tracking**: Sales cadence management for gym leads

## Architecture

```
src/
├── lib/
│   ├── scraper.ts        # Web scraping utilities
│   ├── hapana.ts         # Hapana booking system client
│   ├── sync.ts           # Data synchronization logic
│   └── response.ts       # Response formatting
├── tools/
│   ├── get_schedule.ts          # Get class schedule
│   ├── get_packages.ts          # Get membership packages
│   ├── get_intro_offer.ts       # Get intro offers
│   ├── get_business_details.ts  # Get business info
│   ├── refresh_data.ts          # Full data refresh
│   ├── sync_packages.ts         # Sync packages only
│   ├── sync_classes.ts          # Sync classes only
│   └── update_business_details.ts  # Update business info
├── server/
│   ├── mcp_server.ts     # MCP server entry point
│   └── hooks/
│       └── install.ts    # Install handler with data discovery
└── registries.ts         # Tool exports
```

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   BFT Website   │────▶│    Scraper      │────▶│   Skedyul       │
│   (Hapana)      │     │                 │     │   Models        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

1. **Install**: User provides BFT club URL
2. **Discovery**: Scraper extracts Hapana site ID and initial data
3. **Sync**: Data is imported into Skedyul models
4. **Refresh**: Tools allow manual re-sync of data

## Tools

| Tool | Description |
|------|-------------|
| `get_schedule` | Get class schedule from BFT |
| `get_packages` | Get membership packages |
| `get_intro_offer` | Get intro offer details |
| `get_business_details` | Get business contact information |
| `refresh_data` | Full data refresh (packages, classes, business) |
| `sync_packages` | Sync packages only |
| `sync_classes` | Sync classes only |
| `update_business_details` | Update business information |

## Models

### package (SHARED)

Membership packages and intro offers.

| Field | Type | Owner | Description |
|-------|------|-------|-------------|
| `name` | STRING | APP | Package name |
| `description` | LONG_STRING | APP | Package description |
| `price` | STRING | APP | Price information |
| `type` | STRING | APP | "package" or "intro_offer" |

### class (SHARED)

Class types and descriptions.

| Field | Type | Owner | Description |
|-------|------|-------|-------------|
| `name` | STRING | APP | Class name |
| `description` | LONG_STRING | APP | Class description |
| `duration` | STRING | APP | Class duration |
| `category` | STRING | APP | Class category |

### business_details (INTERNAL)

Business contact information for the BFT club.

| Field | Type | Owner | Description |
|-------|------|-------|-------------|
| `name` | STRING | APP | Business name |
| `club_id` | STRING | APP | Parsed club identifier |
| `address` | STRING | APP | Business address |
| `phone` | STRING | APP | Phone number |
| `email` | STRING | APP | Email address |
| `website_url` | STRING | APP | Source website URL |

### prospect (SHARED)

Sales cadence tracking for gym prospects.

| Field | Type | Owner | Description |
|-------|------|-------|-------------|
| `stage` | STRING | APP | Sales stage (NEW_LEAD, CONTACTED, TRIAL_BOOKED, etc.) |
| `source` | STRING | APP | Lead source (WALK_IN, WEBSITE, REFERRAL, etc.) |
| `interest` | STRING | APP | Interest type (MEMBERSHIP, INTRO_OFFER, etc.) |
| `follow_up_date` | DATE | APP | Next follow-up date |
| `notes` | LONG_STRING | APP | Conversation notes |

## Environment Variables

### Provision-Level (Developer)

No provision-level environment variables required.

### Install-Level (User)

| Variable | Required | Description |
|----------|----------|-------------|
| `BFT_URL` | Yes | Full URL to the BFT club page |

Example: `https://www.bodyfittraining.au/club/braybrook`

## Pages

| Page | Path | Description |
|------|------|-------------|
| Packages | `/packages` | View and sync packages (default) |
| Classes | `/classes` | View and sync classes |
| General | `/settings` | Business details and full sync |
| Prospects | `/prospects` | Sales cadence tracking |

## Install Flow

1. User provides BFT club URL
2. Install handler validates URL format
3. Scraper discovers Hapana site ID
4. Initial data sync runs automatically
5. Business details, packages, and classes are imported

```ts
// src/server/hooks/install.ts
export default async function install(ctx: InstallHandlerContext) {
  const { BFT_URL } = ctx.env

  if (!BFT_URL) {
    throw new MissingRequiredFieldError('BFT_URL')
  }

  // Validate URL format
  try {
    new URL(BFT_URL)
  } catch {
    throw new InvalidConfigurationError('BFT_URL', `Invalid URL: ${BFT_URL}`)
  }

  // Discover Hapana data
  const discovery = await discoverHapanaData(BFT_URL)

  // Sync initial data
  await syncFromDiscovery(BFT_URL, discovery)

  return {
    env: {
      BFT_URL,
      HAPANA_SITE_ID: discovery.siteId,
    },
  }
}
```

## Development

```bash
# Navigate to integration
cd integrations/bft

# Link to test workplace
skedyul dev link --workplace my-test-gym

# Start development server
skedyul dev serve --workplace my-test-gym
```

### Testing Tools

```bash
# Get packages
skedyul dev invoke get_packages --workplace my-test-gym

# Refresh all data
skedyul dev invoke refresh_data --workplace my-test-gym

# Get schedule
skedyul dev invoke get_schedule --workplace my-test-gym
```

## Troubleshooting

### "Invalid URL" error

Ensure the BFT_URL is a complete URL including the protocol:
- Correct: `https://www.bodyfittraining.au/club/braybrook`
- Incorrect: `bodyfittraining.au/club/braybrook`

### Data not syncing

1. Verify the club URL is accessible
2. Check that the Hapana site ID was discovered during install
3. Try running `refresh_data` tool manually

### Missing packages or classes

The scraper extracts data from the public website. Some data may not be available if:
- The club page structure has changed
- The data is behind authentication
- The Hapana booking system is unavailable
