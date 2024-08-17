import SibApiV3Sdk from 'sib-api-v3-sdk';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email, isSubscribed } = req.body;

    let defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    let apiInstance = new SibApiV3Sdk.ContactsApi();

    try {
      let existingContact = await apiInstance.getContactInfo(email);

      if (existingContact) {
        if (isSubscribed) {
          await apiInstance.updateContact(email, {
            listIds: [...new Set([...existingContact.listIds, parseInt(process.env.BREVO_NEWSLETTER_ID)])]
          });
        } else {
          await apiInstance.updateContact(email, {
            listIds: existingContact.listIds.filter(id => id !== parseInt(process.env.BREVO_NEWSLETTER_ID))
          });
        }
        res.status(200).json({ message: 'Subscription updated successfully' });
      } else {
        res.status(404).json({ message: 'Contact not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error updating subscription', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}