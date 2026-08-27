const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');

function cleanMetaVal(str, fallback = '') {
  if (!str) return fallback;
  if (typeof str !== 'string') return String(str);
  if (str.includes('<test lead:') || str.includes('dummy data for')) {
    if (str.includes('ism') || str.includes('name')) return 'Test Mijoz (Meta Test)';
    if (str.includes('phone') || str.includes('telefon') || str.includes('bog\'lanish')) return '+998901234567';
    if (str.includes('filial') || str.includes('shaxar') || str.includes('city')) return 'Toshkent Filiali';
    return str.replace(/<test lead: dummy data for |>/gi, '').trim();
  }
  return str.trim();
}

// Helper to fetch lead details from Meta Graph API if leadgen_id is present
async function fetchMetaLeadDetails(leadgenId, accessToken) {
  if (!leadgenId) return null;
  try {
    const token = accessToken || process.env.META_ACCESS_TOKEN;
    if (!token) return null;

    const res = await fetch(`https://graph.facebook.com/v20.0/${leadgenId}?access_token=${token}`);
    const data = await res.json();
    console.log('📦 META GRAPH API LEAD DATA:', JSON.stringify(data, null, 2));

    if (data && data.field_data) {
      let extractedName = '';
      let extractedPhone = '';
      let extractedCity = '';
      let extraNotes = [];

      for (const field of data.field_data) {
        const val = field.values && field.values[0] ? field.values[0] : '';
        const lowerName = (field.name || '').toLowerCase();

        if (lowerName.includes('ism') || lowerName.includes('name') || lowerName.includes('full_name')) {
          extractedName = cleanMetaVal(val, 'Meta Mijoz');
        } else if (lowerName.includes('telefon') || lowerName.includes('phone') || lowerName.includes('raqam') || lowerName.includes('bog\'lanish')) {
          extractedPhone = cleanMetaVal(val, '+998901234567');
        } else if (lowerName.includes('shaxar') || lowerName.includes('filial') || lowerName.includes('city') || lowerName.includes('region')) {
          extractedCity = cleanMetaVal(val, 'Toshkent');
          extraNotes.push(`Filial/Shahar: ${extractedCity}`);
        } else {
          extraNotes.push(`${field.name}: ${cleanMetaVal(val, '')}`);
        }
      }

      return {
        name: extractedName || 'Meta Mijoz',
        phone: extractedPhone || '+998901234567',
        region: extractedCity || 'Toshkent',
        notes: extraNotes.join('\n'),
        leadgenId
      };
    }
  } catch (err) {
    console.error('Error fetching Meta lead details:', err.message);
  }
  return null;
}

// -------------------------------------------------------------
// PUBLIC WEBHOOKS (META / INSTAGRAM / MAKE.COM / ZAPIER)
// -------------------------------------------------------------

// POST /api/leads/meta-webhook - Receive Meta Lead Ads
router.post('/meta-webhook', async (req, res) => {
  try {
    console.log('📥 INCOMING META LEAD BODY:', JSON.stringify(req.body, null, 2));

    let bodyData = req.body || {};
    if (typeof req.body === 'string') {
      try {
        bodyData = JSON.parse(req.body);
      } catch (e) {
        bodyData = {};
      }
    }

    let name = bodyData.name || req.query.name;
    let phone = bodyData.phone || req.query.phone;
    let region = bodyData.region || req.query.region || 'toshkent_shaxri';
    let source = bodyData.source || req.query.source || 'Instagram Ads (Meta Direct)';
    let notes = bodyData.notes || req.query.notes || '';
    let companyId = bodyData.companyId ? parseInt(bodyData.companyId) : 1;

    // If payload is a direct Meta Webhook notification (entry array)
    if (bodyData.entry && Array.isArray(bodyData.entry)) {
      for (const entryItem of bodyData.entry) {
        if (entryItem.changes && Array.isArray(entryItem.changes)) {
          for (const change of entryItem.changes) {
            if (change.field === 'leadgen' && change.value) {
              const leadgenId = change.value.leadgen_id;
              const formId = change.value.form_id;

              const fetched = await fetchMetaLeadDetails(leadgenId);
              if (fetched) {
                name = fetched.name;
                phone = fetched.phone;
                region = fetched.region || region;
                notes = fetched.notes || notes;
              } else {
                name = name || `Meta Lead #${leadgenId ? leadgenId.slice(-4) : 'Yangi'}`;
                phone = phone || '+998';
                notes = `Meta Form ID: ${formId || ''}, Leadgen ID: ${leadgenId || ''}`;
              }
            }
          }
        }
      }
    }

    // Save lead into Database
    const savedLead = await prisma.lead.create({
      data: {
        companyId: companyId,
        name: name || 'Yangi Mijoz',
        phone: phone || '+998',
        region: region,
        source: source,
        notes: notes,
        stage: 'new',
        revenue: 0
      }
    });

    const leadPayload = {
      id: `Lead #${savedLead.id}`,
      dbId: savedLead.id,
      name: savedLead.name,
      phone: savedLead.phone,
      region: savedLead.region,
      source: savedLead.source,
      notes: savedLead.notes,
      stage: savedLead.stage,
      revenue: savedLead.revenue,
      createdAt: savedLead.createdAt
    };

    // Emit real-time Socket.io event to all connected Call Operators
    const io = req.app.get('io');
    if (io) {
      io.emit('new_lead_received', leadPayload);
    }

    res.status(200).json({
      success: true,
      message: 'Lead received and stored successfully!',
      data: leadPayload
    });
  } catch (error) {
    console.error('Lead webhook error:', error);
    res.status(200).json({ success: true, message: 'Lead acknowledged' });
  }
});

// GET /api/leads/meta-webhook - Meta Webhook Verification Challenge
router.get('/meta-webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === 'hotelbase_lead_secret_2026') {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// -------------------------------------------------------------
// AUTHENTICATED CALL CENTER & CRM ENDPOINTS
// -------------------------------------------------------------

// GET /api/leads - Fetch all leads
router.get('/', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;
    const { search, stage } = req.query;

    const where = { companyId };
    if (stage && stage !== 'all') {
      where.stage = stage;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        callLogs: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedLeads = leads.map(l => ({
      id: `Lead #${l.id}`,
      dbId: l.id,
      name: l.name,
      phone: l.phone,
      region: l.region,
      tag: l.tag || l.source || '',
      source: l.source,
      roomType: l.roomType,
      revenue: l.revenue || 0,
      stage: l.stage,
      taskStatus: l.taskStatus || 'none',
      taskText: l.taskText || 'No Tasks 🟡',
      notes: l.notes || '',
      createdAt: l.createdAt.toISOString(),
      rawCreatedAt: l.createdAt,
      timeline: (l.callLogs || []).map(cl => ({
        id: cl.id,
        type: 'call',
        text: `${cl.direction === 'incoming' ? 'Kiruvchi' : 'Chiquvchi'} qo'ng'iroq (${Math.floor(cl.duration / 60)}m ${cl.duration % 60}s)`,
        time: cl.createdAt.toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' }),
        audioUrl: cl.audioUrl
      }))
    }));

    res.json({ success: true, data: formattedLeads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ success: false, message: 'Lidlarni yuklashda xatolik' });
  }
});

// POST /api/leads - Create a new lead manually
router.post('/', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;
    const { name, phone, region, tag, source, roomType, checkIn, checkOut, notes, revenue, stage } = req.body;

    const lead = await prisma.lead.create({
      data: {
        companyId,
        branchId: req.user.branchId || null,
        name: name || 'Yangi Mijoz',
        phone: phone || '+998',
        region: region || 'toshkent_shaxri',
        tag: tag || null,
        source: source || "Qo'lda kiritildi (Operator)",
        roomType: roomType || 'Standard',
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        notes: notes || '',
        revenue: parseFloat(revenue) || 0,
        stage: stage || 'new',
        assignedToId: req.user.id
      }
    });

    const leadFormatted = {
      id: `Lead #${lead.id}`,
      dbId: lead.id,
      name: lead.name,
      phone: lead.phone,
      region: lead.region,
      tag: lead.tag || lead.source,
      source: lead.source,
      roomType: lead.roomType,
      revenue: lead.revenue,
      stage: lead.stage,
      taskStatus: 'none',
      taskText: 'No Tasks 🟡',
      notes: lead.notes,
      createdAt: lead.createdAt.toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' }),
      rawCreatedAt: lead.createdAt,
      timeline: []
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('new_lead_received', leadFormatted);
    }

    res.status(201).json({ success: true, data: leadFormatted });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ success: false, message: 'Lid yaratishda xatolik yuz berdi' });
  }
});

// PATCH /api/leads/:id - Update lead (stage, notes, revenue, etc.)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const leadId = parseInt(req.params.id.replace('Lead #', ''));
    const { stage, notes, revenue, name, phone, region, taskStatus, taskText } = req.body;

    const dataToUpdate = {};
    if (stage !== undefined) dataToUpdate.stage = stage;
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (revenue !== undefined) dataToUpdate.revenue = parseFloat(revenue);
    if (name !== undefined) dataToUpdate.name = name;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (region !== undefined) dataToUpdate.region = region;
    if (taskStatus !== undefined) dataToUpdate.taskStatus = taskStatus;
    if (taskText !== undefined) dataToUpdate.taskText = taskText;

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: dataToUpdate
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('lead_updated', { id: `Lead #${updated.id}`, dbId: updated.id, ...dataToUpdate });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ success: false, message: 'Lidni yangilashda xatolik' });
  }
});

// DELETE /api/leads/:id - Delete a lead
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const leadId = parseInt(req.params.id.replace('Lead #', ''));
    await prisma.leadCallLog.deleteMany({ where: { leadId } });
    await prisma.lead.delete({ where: { id: leadId } });
    res.json({ success: true, message: "Lid o'chirildi" });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ success: false, message: "Lidni o'chirishda xatolik" });
  }
});

// GET /api/leads/stats - Dynamic KPI Analytics for Call Operator & Owner
router.get('/stats', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;
    const { period } = req.query; // 'today', 'week', 'month', 'year'

    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1); // default month start

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'week') {
      const day = now.getDay() || 7;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0);
    }

    const whereTime = {
      companyId,
      createdAt: { gte: startDate }
    };

    // 1. Leads by Stage
    const leads = await prisma.lead.findMany({ where: whereTime });
    const totalLeads = leads.length;
    const bookedLeads = leads.filter(l => ['booked', 'sold', 'repeat_sale'].includes(l.stage));
    const bookedCount = bookedLeads.length;
    const totalRevenue = bookedLeads.reduce((sum, l) => sum + (l.revenue || 0), 0);
    const noAnswerCount = leads.filter(l => l.stage === 'no_answer').length;
    const convRate = totalLeads > 0 ? Math.round((bookedCount / totalLeads) * 100) : 0;

    // 2. Call Logs stats (Dynamic from Asterisk master.db & DB)
    let asteriskDuration = 0;
    let asteriskTotalCalls = 0;
    try {
      const { NodeSSH } = require('node-ssh');
      const astSSH = new NodeSSH();
      await astSSH.connect({
        host: '89.126.208.59',
        username: 'root',
        password: 'Je%K8$Q42R7H%IH',
        readyTimeout: 4000
      });
      const cdrStatsQuery = `sqlite3 -header -csv /var/log/asterisk/master.db "
        SELECT calldate, billsec 
        FROM cdr 
        WHERE lastapp != 'Hangup'
        ORDER BY calldate DESC;
      "`;
      const cdrRes = await astSSH.execCommand(cdrStatsQuery);
      astSSH.dispose();

      const lines = cdrRes.stdout.trim().split('\n').filter(Boolean);
      if (lines.length > 0 && lines[0].toLowerCase().includes('calldate')) lines.shift();

      for (const line of lines) {
        const parts = line.split(',');
        const start = (parts[0] || '').replace(/"/g, '').trim();
        const billsec = parseInt((parts[1] || '').replace(/"/g, '')) || 0;
        if (start) {
          const callDateObj = new Date(start.replace(' ', 'T') + '+05:00');
          if (callDateObj >= startDate) {
            asteriskTotalCalls++;
            asteriskDuration += billsec;
          }
        }
      }
    } catch (astErr) {
      console.log('Asterisk stats lookup note:', astErr.message);
    }

    const callLogs = await prisma.leadCallLog.findMany({ where: whereTime });
    const dbCallsCount = callLogs.length;
    const dbDuration = callLogs.reduce((sum, cl) => sum + (cl.duration || 0), 0);

    const totalCalls = Math.max(asteriskTotalCalls, dbCallsCount);
    const totalDuration = Math.max(asteriskDuration, dbDuration);

    const hours = Math.floor(totalDuration / 3600);
    const mins = Math.floor((totalDuration % 3600) / 60);
    const talkTimeString = hours > 0 ? `${hours} soat ${mins} daq` : `${mins} daq`;

    // 3. Source Breakdown
    const sources = {};
    leads.forEach(l => {
      const s = l.source || 'Boshqa';
      sources[s] = (sources[s] || 0) + 1;
    });

    const sourceBreakdown = Object.keys(sources).map(name => ({
      name,
      count: sources[name],
      percent: totalLeads > 0 ? Math.round((sources[name] / totalLeads) * 100) : 0
    }));

    // Target Revenue (Default target: 25,000,000 UZS)
    const targetRevenue = 25000000;
    const targetProgress = Math.min(100, Math.round((totalRevenue / targetRevenue) * 100));

    res.json({
      success: true,
      data: {
        totalCalls,
        talkTime: talkTimeString,
        totalDurationSeconds: totalDuration,
        bookedDeals: bookedCount,
        revenue: totalRevenue,
        convRate: `${convRate}%`,
        noAnswer: noAnswerCount,
        totalLeads,
        targetRevenue,
        targetProgress,
        sourceBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching operator stats:', error);
    res.status(500).json({ success: false, message: 'Statistikani hisoblashda xatolik' });
  }
});

// GET /api/leads/calls - Fetch Call Logs History (Integrated with Asterisk PBX CDR & Audio)
// GET /api/leads/calls - Fetch Call Logs History with Pagination & Date Filters
router.get('/calls', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const search = (req.query.search || '').trim().toLowerCase();
    const direction = req.query.direction || 'all'; // 'all', 'incoming', 'outgoing', 'recorded'
    const dateRange = req.query.dateRange || 'all'; // 'all', 'today', 'yesterday', 'week', 'month', 'custom'
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // Fetch leads to map names and lead ids
    const leads = await prisma.lead.findMany({
      where: { companyId },
      select: { id: true, name: true, phone: true }
    });

    let allCalls = [];
    try {
      const { NodeSSH } = require('node-ssh');
      const astSSH = new NodeSSH();
      await astSSH.connect({
        host: '89.126.208.59',
        username: 'root',
        password: 'Je%K8$Q42R7H%IH',
        readyTimeout: 5000
      });

      const cdrQuery = `sqlite3 -header -csv /var/log/asterisk/master.db "
        SELECT calldate, src, dst, clid, channel, dstchannel, duration, billsec, disposition, uniqueid 
        FROM cdr 
        WHERE lastapp != 'Hangup'
        ORDER BY calldate DESC;
      "`;
      const cdrRes = await astSSH.execCommand(cdrQuery);
      const monitorRes = await astSSH.execCommand('find /var/spool/asterisk/monitor/ -type f -size +5k -name "*.*" -printf "%s %p\\n"');
      astSSH.dispose();

      const monitorFiles = (monitorRes.stdout || '').trim().split('\n').filter(Boolean).map(line => {
        const parts = line.trim().split(/\s+/);
        const size = parseInt(parts[0], 10);
        const fullPath = parts[1] || '';
        const filename = fullPath.split('/').pop();
        return { size, filename };
      });

      const lines = cdrRes.stdout.trim().split('\n').filter(Boolean);
      if (lines.length > 0 && lines[0].toLowerCase().includes('calldate')) {
        lines.shift();
      }

      for (const line of lines) {
        const values = [];
        const regex = /(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
          if (match.index === regex.lastIndex) regex.lastIndex++;
          const val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
          values.push(val);
        }
        if (values.length >= 9) {
          const calldate = values[0];
          const src = values[1];
          const dst = values[2];
          const clid = values[3];
          const channel = values[4] || '';
          const dstchannel = values[5] || '';
          const duration = parseInt(values[6]) || 0;
          const billsec = parseInt(values[7]) || 0;
          const disposition = values[8] || '';

          const isOutbound = src === '1001w' || channel.includes('1001w');
          const targetPhone = isOutbound ? dst : src;
          const cleanPhone = (targetPhone || '').replace(/\D/g, '');

          // Exclude synthetic developer test patterns
          if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.startsWith('000') || cleanPhone === '1234567' || cleanPhone === '901234567') {
            continue;
          }

          const isAnswered = disposition === 'ANSWERED' && billsec > 0;
          
          let dateStr = calldate;
          let timeStr = '';
          let rawDate = null;
          if (calldate && calldate.includes(' ')) {
            const [dPart, tPart] = calldate.split(' ');
            if (dPart) {
              const [y, m, d] = dPart.split('-');
              if (y && m && d) dateStr = `${d}.${m}.${y}`;
            }
            if (tPart) {
              timeStr = tPart.slice(0, 5);
            }
            rawDate = new Date(calldate.replace(' ', 'T') + '+05:00');
          }

          const mins = Math.floor(billsec / 60).toString().padStart(2, '0');
          const secs = (billsec % 60).toString().padStart(2, '0');

          // Exact match recording file for THIS call only (must be answered and within +-60 seconds)
          let exactAudioFilename = null;
          if (isAnswered && cleanPhone && calldate) {
            const callDate = new Date(calldate.replace(' ', 'T') + '+05:00').getTime();
            const dateCompact = (calldate.split(' ')[0] || '').replace(/-/g, '');

            let closestDiff = Infinity;
            let bestMatch = null;

            for (const f of monitorFiles) {
              const fName = f.filename;
              if (!fName.includes(cleanPhone.slice(-7)) || !fName.includes(dateCompact)) continue;

              // Match filename timestamp: (in|out)-YYYYMMDD-HHMMSS-PHONE
              const match = fName.match(/(?:in|out)-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
              if (match) {
                const fileDate = new Date(
                  `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}+05:00`
                ).getTime();
                const diffSeconds = Math.abs((callDate - fileDate) / 1000);
                if (diffSeconds <= 60 && diffSeconds < closestDiff) {
                  closestDiff = diffSeconds;
                  bestMatch = fName;
                }
              }
            }
            if (bestMatch) {
              exactAudioFilename = bestMatch;
            }
          }

          const hasRecord = isAnswered && !!exactAudioFilename;
          const audioUrl = hasRecord 
            ? `/api/recordings/fetch?filename=${encodeURIComponent(exactAudioFilename)}&phone=${encodeURIComponent(cleanPhone)}&duration=${billsec}` 
            : null;

          // Match with CRM lead
          const matchedLead = leads.find(l => {
            const lPhone = (l.phone || '').replace(/\D/g, '');
            return lPhone && cleanPhone && (lPhone.includes(cleanPhone.slice(-7)) || cleanPhone.includes(lPhone.slice(-7)));
          });

          allCalls.push({
            id: 'ast-' + calldate.replace(/[- :]/g, '') + '-' + cleanPhone,
            rawDate: rawDate ? rawDate.toISOString() : calldate,
            date: dateStr,
            time: timeStr,
            direction: isOutbound ? 'outgoing' : 'incoming',
            typeText: (isOutbound ? 'Chiquvchi' : 'Kiruvchi') + ' ' + targetPhone,
            name: matchedLead ? matchedLead.name : `Mijoz (+998 ${cleanPhone.length === 9 ? cleanPhone : cleanPhone.slice(-9)})`,
            leadId: matchedLead ? matchedLead.id : null,
            leadName: matchedLead ? `Lead #${matchedLead.id}` : '—',
            phone: '+998 ' + (cleanPhone.length === 9 ? cleanPhone : cleanPhone.slice(-9)),
            duration: `${mins}:${secs}`,
            billsec: billsec,
            status: isAnswered ? 'Muloqot yakunlandi' : (disposition === 'BUSY' ? 'Band' : 'Javobsiz'),
            hasRecord,
            audioUrl,
            operatorName: 'Call Operator'
          });
        }
      }
    } catch (e) {
      console.log('Error fetching PBX calls:', e.message);
    }

    // Sort: newest call at top (descending)
    allCalls.sort((a, b) => new Date(b.rawDate || 0) - new Date(a.rawDate || 0));

    // Date range filtering logic
    const now = new Date();
    const todayStr = now.toLocaleDateString('ru-RU', { timeZone: 'Asia/Tashkent' });

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('ru-RU', { timeZone: 'Asia/Tashkent' });

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Filter by Date Range and Search (base pool for metrics & badges)
    const baseFilteredCalls = allCalls.filter(call => {
      // Date Range Filter
      const callDateObj = new Date(call.rawDate || 0);
      if (dateRange === 'today' && call.date !== todayStr) return false;
      if (dateRange === 'yesterday' && call.date !== yesterdayStr) return false;
      if (dateRange === 'week' && callDateObj < sevenDaysAgo) return false;
      if (dateRange === 'month' && callDateObj < startOfMonth) return false;
      if (dateRange === 'custom') {
        if (startDate && callDateObj < new Date(startDate)) return false;
        if (endDate && callDateObj > new Date(endDate + 'T23:59:59')) return false;
      }

      // Search Filter
      if (search) {
        const nameMatch = (call.name || '').toLowerCase().includes(search);
        const phoneMatch = (call.phone || '').replace(/\D/g, '').includes(search.replace(/\D/g, ''));
        const leadMatch = (call.leadName || '').toLowerCase().includes(search);
        if (!nameMatch && !phoneMatch && !leadMatch) return false;
      }

      return true;
    });

    // Summary metrics (remains stable and accurate across all tabs)
    const summary = {
      totalCalls: baseFilteredCalls.length,
      incoming: baseFilteredCalls.filter(c => c.direction === 'incoming').length,
      outgoing: baseFilteredCalls.filter(c => c.direction === 'outgoing').length,
      answered: baseFilteredCalls.filter(c => c.billsec > 0).length,
      recorded: baseFilteredCalls.filter(c => c.hasRecord).length
    };

    // 2. Filter by Direction for the displayed table list
    let filteredCalls = baseFilteredCalls.filter(call => {
      if (direction === 'incoming' && call.direction !== 'incoming') return false;
      if (direction === 'outgoing' && call.direction !== 'outgoing') return false;
      if (direction === 'recorded' && !call.hasRecord) return false;
      return true;
    });

    // Pagination slice
    const total = filteredCalls.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedData = filteredCalls.slice(offset, offset + limit);

    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        total,
        page,
        limit,
        totalPages
      },
      summary
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    res.status(500).json({ success: false, message: 'Qo\'ng\'iroqlar tarixini yuklashda xatolik' });
  }
});

// POST /api/leads/calls - Log a completed call
router.post('/calls', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId || 1;
    const { leadId, phone, direction, duration, status, audioUrl, notes } = req.body;

    let parsedLeadId = null;
    if (leadId) {
      if (typeof leadId === 'string') {
        parsedLeadId = parseInt(leadId.replace('Lead #', ''));
      } else {
        parsedLeadId = parseInt(leadId);
      }
    }

    const newCallLog = await prisma.leadCallLog.create({
      data: {
        companyId,
        leadId: parsedLeadId || null,
        operatorId: req.user.id,
        phone: phone || '+998',
        direction: direction || 'outgoing',
        duration: parseInt(duration) || 0,
        status: status || 'Muloqot yakunlandi',
        audioUrl: audioUrl || null,
        notes: notes || null
      }
    });

    res.status(201).json({ success: true, data: newCallLog });
  } catch (error) {
    console.error('Error saving call log:', error);
    res.status(500).json({ success: false, message: 'Qo\'ng\'iroqni saqlashda xatolik' });
  }
});

module.exports = router;
