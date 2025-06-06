// pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
        if (err || !files.image) {
            return res.status(400).json({ error: "Erreur lors de l'envoi du fichier." });
        }

        const file = Array.isArray(files.image) ? files.image[0] : files.image;

        const data = new FormData();
        data.append("image", fs.createReadStream(file.filepath));

        try {
            const upload = await axios.post("https://gytx.dev/discretion241/api/upload_image.php", data, {
                headers: data.getHeaders(),
            });
            return res.status(200).json({ url: upload.data.url });
        } catch (e) {
            return res.status(500).json({ error: "Échec de l'upload distant." });
        }
    });
}