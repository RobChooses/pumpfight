require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    "chiliz-spicy": {
      url: "https://spicy-rpc.chiliz.com/",
      chainId: 88882,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    "chiliz-mainnet": {
      url: "https://rpc.chiliz.com/",
      chainId: 88888,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      "chiliz-spicy": "abc", // Placeholder
      "chiliz-mainnet": "abc", // Placeholder
    },
    customChains: [
      {
        network: "chiliz-spicy",
        chainId: 88882,
        urls: {
          apiURL: "https://spicy-blockscout.chiliz.com/api",
          browserURL: "https://spicy-blockscout.chiliz.com/",
        },
      },
      {
        network: "chiliz-mainnet",
        chainId: 88888,
        urls: {
          apiURL: "https://blockscout.chiliz.com/api",
          browserURL: "https://blockscout.chiliz.com/",
        },
      },
    ],
  },
};