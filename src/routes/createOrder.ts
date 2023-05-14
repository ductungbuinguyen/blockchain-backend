import express from 'express'
import { User } from '../entities/User';
import cors from 'cors';
import { createOrder, generatePublicApiSignature } from '../utils/contract';

const router = express.Router()

router.post('/', cors(), async (req, res) => {
  // console.log('create order')
  const merchantApiKey = req.get('bcps-api-key');
  // console.log("merchantApiKey", merchantApiKey)
  const apiSignature = req.get('bcps-signature');
  // console.log("apiSignature", apiSignature)
  const { buyer, nonce, price, shipDeadline, name, signature } = req.body;
  // console.log("req body", req.body)
  const existingUser = await User.findOne({
    where: { id: merchantApiKey },
    relations: ['contract', 'merchantMetaData'],
  });
  // console.log("existingUser", existingUser)
  if (!existingUser || !existingUser?.merchantMetaData) return res.sendStatus(403)
  // console.log("pass existing user")
  const reGeneratedSignature = generatePublicApiSignature({
    body: JSON.stringify(req.body),
    secretKey: existingUser.merchantMetaData.merchantSecretKey
  })
  // console.log("reGeneratedSignature", reGeneratedSignature)
  if(apiSignature !== reGeneratedSignature) return res.sendStatus(403)
  // console.log("pass reGeneratedSignature")
  const based64QrCode = await createOrder({
    contractAddress: existingUser?.contract?.address,
    buyerAddress: buyer,
    nonce,
    price,
    shipDeadline,
    signature,
    name,
  });
  // console.log("result", result)
  if(based64QrCode) return res.json({
    qrCode: based64QrCode
  })
  return res.sendStatus(500)
})

export default router