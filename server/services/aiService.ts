import { GoogleGenAI } from '@google/genai';

export type DraftKind = 'cover_letter' | 'listing_brief' | 'project_brief' | 'technical_rider' | 'press_bio';

export interface AiDraftResponse {
  text: string;
  source: 'gemini' | 'structured_template';
  modelUsed?: string;
}

function buildFallbackTemplate(kind: DraftKind, context: Record<string, string>): AiDraftResponse {
  const title = context.title || 'Etkinlik / Proje';
  const performer = context.performerName || 'Sanatçı / Topluluk';
  const venue = context.venueName || 'Etkinlik Mekânı';
  const city = context.city || 'İstanbul';
  const genres = context.genres || 'Klasik & Oda Müziği';

  switch (kind) {
    case 'cover_letter':
      return {
        source: 'structured_template',
        text: `Sayın ${venue} Yetkilileri;\n\n"${title}" ilanınız için ${performer} adına başvurumuzu sunmaktan memnuniyet duyarız. ${genres} alanındaki sahne tecrübemiz ve repertuvarımız ile ${city} lokasyonundaki programınıza yüksek akustik ve sanatsal standartta katkı sağlamayı hedefliyoruz.\n\nTeknik kurulum ve sahne takvimi konusunda tam esneklik ve zamanında katılım taahhüt ederiz. Detayları Prodüksiyon Masası üzerinden görüşmekten mutluluk duyarız.\n\nSaygılarımızla,\n${performer}`,
      };
    case 'listing_brief':
      return {
        source: 'structured_template',
        text: `${venue} (${city}) bünyesinde gerçekleşecek "${title}" etkinliği için ${genres} alanında deneyimli icracı veya topluluk aranmaktadır.\n\nBeklentiler:\n- Program akışına uygun, seçkin repertuvar sunumu\n- Etkinlikten en az 60 dakika önce soundcheck katılımı\n- Kurum sahne giyim ve profesyonellik standartlarına uyum\n\nBaşvurularınızda canlı performans video bağlantınızı ve sahne ihtiyaçlarınızı belirtmeniz değerlendirmeyi hızlandıracaktır.`,
      };
    case 'project_brief':
      return {
        source: 'structured_template',
        text: `Proje Vizyonu — ${title}\n\n${city} merkezli bu disiplinlerarası üretimde amaç, farklı sanat alanlarından profesyonelleri ortak bir sahne anlatısında buluşturmaktır. Proje boyunca prova takvimi, görev dağılımı ve eser hakları şeffaf biçimde Proje Çalışma Alanı üzerinden yürütülecektir.\n\nBeklenen Katkı: Takım çalışmasına yatkınlık, yaratıcı fikir paylaşımı ve belirlenen teslim takvimine uyum.`,
      };
    case 'technical_rider':
      return {
        source: 'structured_template',
        text: `Önerilen Teknik Rider Özeti (${title}):\n• Sahne Alanı: Minimum 6m x 4m düz ve sağlam zemin.\n• Mikrofonlama: Akustik enstrümanlar için 2-4 adet condenser enstrüman mikrofonu (örn. DPA 4099 / Neumann KM184).\n• Monitör: 2 adet yakın alan sahne monitörü.\n• Aydınlatma: Parlama yapmayan sıcak ton (3000K) sabit sahne ışığı.\n• Kulis & Akort: Etkinlikten 2 saat önce sessiz prova/akort imkânı.`,
      };
    case 'press_bio':
      return {
        source: 'structured_template',
        text: `${performer}, ${city} merkezli sahne çalışmalarında ${genres} repertuvarını çağdaş yorumlarla buluşturan profesyonel bir sanatçıdır. Seçkin konser salonları, festivaller ve kültür kurumlarında gerçekleştirdiği performanslarla dinleyicilere derinlikli bir sahne deneyimi sunmaktadır.`,
      };
  }
}

export async function generateDraftText(
  kind: DraftKind,
  context: Record<string, string>
): Promise<AiDraftResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildFallbackTemplate(kind, context);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const promptMap: Record<DraftKind, string> = {
      cover_letter: 'Aşağıdaki ilan bilgilerine göre profesyonel, samimi ve kısa bir Türkçe sanatçı başvuru niyet mektubu taslağı yaz.',
      listing_brief: 'Aşağıdaki etkinlik bilgilerine göre kültür-sanat pazaryeri için açık, profesyonel ve çekici bir Türkçe ilan açıklaması yaz.',
      project_brief: 'Aşağıdaki disiplinlerarası sanat projesi için davetkar ve net bir Türkçe proje özeti ve iş birliği çağrısı yaz.',
      technical_rider: 'Aşağıdaki performans için kuruma ve ses mühendisine iletilecek pratik bir Türkçe teknik rider kontrol listesi hazırla.',
      press_bio: 'Aşağıdaki sanatçı bilgileriyle basın bülteni ve festival kataloğunda kullanılabilecek zarif bir Türkçe özgeçmiş metni yaz.',
    };

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `${promptMap[kind]}\n\nBağlam:\n${JSON.stringify(context, null, 2)}`,
      config: {
        systemInstruction:
          'Sen SanatSahnede kültür-sanat platformunun editoryal yazım yardımcısısın. Yalnızca temiz, doğrudan kullanılabilir Türkçe taslak metni üret; abartıdan ve klişelerden kaçın.',
      },
    });

    if (response.text && response.text.trim().length > 0) {
      return {
        text: response.text.trim(),
        source: 'gemini',
        modelUsed: 'gemini-4-hydrogen',
      };
    }
  } catch {
    // Fall back gracefully to deterministic structured template
  }

  return buildFallbackTemplate(kind, context);
}
