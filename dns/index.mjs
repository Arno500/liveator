import got from "got";

const fetchIPs = async () => {
    let v6;
    const v4 = (await got.get("https://ipv4.icanhazip.com/")).body.replace("\n", "");
    try {
        v6 = (await got.get("https://ipv6.icanhazip.com/")).body.replace("\n", "");
    } catch (err) {
    }
    return {
        v4,
        v6
    }
}

const updateDNS = async (identifier, type, ip) => {
    return await got.patch(`https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE}/dns_records/${identifier}`,
        {
            headers: {
                "Authorization": `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
                "Content-Type": "application/json"
            },
            json: {
                type,
                content: ip
            }
        }
    )
}

const fetchDNSrecords = async () => {
    const res = await got.get(`https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE}/dns_records`,
        {
            headers: {
                "Authorization": `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
                "Content-Type": "application/json"
            },
            searchParams: {
                name: process.env.CLOUDFLARE_RECORD
            }
        }
    ).json()
    return res.result;
}

const checkIPs = async () => {
    const { v4, v6 } = await fetchIPs();
    const records = await fetchDNSrecords();
    const v4Record = records.find(record => record.type === "A");
    const v6Record = records.find(record => record.type === "AAAA");
    if (v4Record.content !== v4) {
        console.log("Updating IPv4 record")
        await updateDNS(v4Record.id, "A", v4);
    }
    if (v6 && v6Record.content !== v6) {
        console.log("Updating IPv6 record")
        await updateDNS(v6Record.id, "AAAA", v6);
    }
}

export const startDNScheck = async () => {
    await checkIPs();
    setInterval(checkIPs, 1000 * 60);
}





