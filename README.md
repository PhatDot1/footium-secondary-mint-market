## THIS IS A SECONDARY ACADEMY MINT MARKET FOR BUYERS ONLY - MINTING FROM MY ACADEMY
# VERSION FOR EVERYONE TO LIST THEIR ACADEMY UNITS COMING SOON!



## TODO

Potential issue: Simultaneous TXN's

Frontend: 
1. BEFORE BUY TRIGGERS WALLET TO SIGN TXN, ADD ERROR HANDLING AND BACKEND CHECK TO VERIFY PLAYER HASNT BEEN MINTED SINCE PAGE WAS RENDERED
2. ROBUST SWITCH WALLET FEATURE? Not too important - can just switch in metamask...




## Schematics

Cant exactly store priv key in smart contract so the current idea will be:

Smart Contract:
Test withdrawls: Make sure my wallet can wirthdraw funds from the contract.  


Other?
blockchain event indexing service to persist events even when backend is down.



This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
