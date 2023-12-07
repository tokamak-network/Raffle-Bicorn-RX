import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { BigNumberish, Contract, ContractTransactionReceipt, Log } from "ethers"
import { network, deployments, ethers, getNamedAccounts } from "hardhat"
import { developmentChains, networkConfig } from "../helper-hardhat-config"
import { testCases, TestCase, BigNumber } from "./shared/testcases"
import { testCases3 } from "./shared/testcases3"
import {
    createTestCases,
    deployAndStartRaffleContract,
    initializedContractCorrectly,
    deployFirstTestCaseRaffleContract,
    commit,
    reveal,
} from "./shared/testFunctions"
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
const { time } = require("@nomicfoundation/hardhat-network-helpers")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle", () => {
          const testcases: TestCase[] = createTestCases(testCases3)
          const chainId = network.config.chainId
          let deployer: SignerWithAddress
          let commitDuration = networkConfig[chainId!].commitDuration
          let commitRevealDuration = networkConfig[chainId!].commitRevealDuration
          let _n: BigNumberish
          before(async () => {
              deployer = await ethers.getSigner((await getNamedAccounts()).deployer)
              console.log(
                  "\n   ___  _                       ___  _  __  ___       _____ \n \
  / _ )(_)______  _______  ____/ _ | |/_/ / _ ___  / ___/ \n \
  / _  / / __/ _ / __/ _ /___/ , _/>  <  / ___/ _ / /__  \n \
  /____/_/__/___/_/ /_//_/   /_/|_/_/|_| /_/   ___/___/  \n",
              )
          })
          describe("deploy contract and check", () => {
              it("every testcase, deploy should pass", async () => {
                  for (let i = 0; i < testcases.length; i++) {
                      let params = [
                          ethers.parseEther("0.01"),
                          commitDuration,
                          commitRevealDuration,
                          testcases[i].n,
                          testcases[i].setupProofs,
                      ]
                      const { commitRecover, receipt } = await deployAndStartRaffleContract(params)
                      expect(commitRecover.target).to.properAddress
                      //   await initializedContractCorrectly(
                      //       commitRecover,
                      //       receipt as ContractTransactionReceipt,
                      //       testcases[i],
                      //   )
                  }
              })
              let firstTestCases: TestCase
              let firstrandomList: BigNumber[] = []
              let firstcommitList: BigNumber[] = []
              let signers: SignerWithAddress[]
              const testCaseNum = 0
              describe("test 1 round", () => {
                  describe("test commit, first testcase", () => {
                      before(async () => {
                          signers = await ethers.getSigners()
                          firstTestCases = testcases[testCaseNum]
                          firstcommitList = firstTestCases.commitList
                          firstrandomList = firstTestCases.randomList
                      })
                      it("commit should pass", async () => {
                          const { commitRecover, testcases } = await loadFixture(
                              deployFirstTestCaseRaffleContract,
                          )
                          for (let i = 0; i < firstcommitList.length; i++) {
                              await commit(commitRecover, signers[i], firstcommitList[i], i, 1)
                          }
                      })
                  })
                  describe("test reveal, first testcase", () => {
                      it("reveal should not pass", async () => {
                          const { commitRecover } = await loadFixture(
                              deployFirstTestCaseRaffleContract,
                          )
                          for (let i = 0; i < firstcommitList.length; i++) {
                              await commit(commitRecover, signers[i], firstcommitList[i], i, 1)
                          }
                          //   await expect(commitRecover.reveal(firstrandomList[0])).to.be.revertedWith(
                          //       "FunctionInvalidAtThisStage",
                          //   )
                      })

                      it("reveal should pass", async () => {
                          const { commitRecover } = await loadFixture(
                              deployFirstTestCaseRaffleContract,
                          )
                          for (let i = 0; i < firstcommitList.length; i++) {
                              await commit(commitRecover, signers[i], firstcommitList[i], i, 1)
                          }
                          await time.increase(networkConfig[network.config.chainId!].commitDuration)
                          for (let i = 0; i < firstrandomList.length; i++) {
                              await reveal(commitRecover, signers[i], firstrandomList[i], i, 1)
                          }
                      })

                      describe("calculate Omega", () => {
                          it("All Revealed, Calculated Omega should be correct", async () => {
                              const { commitRecover } = await loadFixture(
                                  deployFirstTestCaseRaffleContract,
                              )
                              for (let i = 0; i < firstcommitList.length; i++) {
                                  await commit(commitRecover, signers[i], firstcommitList[i], i, 1)
                              }
                              await time.increase(
                                  networkConfig[network.config.chainId!].commitDuration,
                              )
                              for (let i = 0; i < firstrandomList.length; i++) {
                                  await reveal(commitRecover, signers[i], firstrandomList[i], i, 1)
                              }
                              const tx = await commitRecover.calculateOmega(1)
                              const receipt = await tx.wait()
                              console.log("calculateOmega gas used", receipt.gasUsed.toString())
                              const omega = (await commitRecover.valuesAtRound(1)).omega
                              console.log(
                                  omega,
                                  testcases[testCaseNum].omega,
                                  testcases[testCaseNum].recoveredOmega,
                              )
                          })
                          it("Recovered Omega should be correct", async () => {
                              const { commitRecover } = await loadFixture(
                                  deployFirstTestCaseRaffleContract,
                              )
                              for (let i = 0; i < firstcommitList.length; i++) {
                                  await commit(commitRecover, signers[i], firstcommitList[i], i, 1)
                              }
                              //await commit(commitRecover, signers[0], firstcommitList[0], 0, 1)
                              await time.increase(
                                  networkConfig[network.config.chainId!].commitDuration,
                              )
                              //   for (let i = 0; i < firstrandomList.length - 2; i++) {
                              //     console.log("i", i);
                              //       await reveal(commitRecover, signers[i], firstrandomList[i], i, 1)
                              //   }
                              //console.log(testcases[testCaseNum].recoveryProofs)
                              const tx = await commitRecover.recover(
                                  1,
                                  testcases[testCaseNum].recoveryProofs,
                              )
                              const receipt = await tx.wait()
                              console.log("recover gas used", receipt.gasUsed.toString())
                              const omega = (await commitRecover.valuesAtRound(1)).omega
                              console.log(
                                  omega,
                                  testcases[testCaseNum].omega,
                                  testcases[testCaseNum].recoveredOmega,
                              )
                              // get Winner
                              const winner = await commitRecover.getWinnerAddress(1)
                          })
                      })
                  })
              })
          })
      })
