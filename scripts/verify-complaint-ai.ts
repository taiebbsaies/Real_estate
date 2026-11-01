#!/usr/bin/env node
/**
 * Focused verification for automatic complaint classification.
 *
 * Usage (from the repository root):
 *   npx --yes tsx scripts/verify-complaint-ai.ts
 *
 * No real AI provider is called. A loopback OpenAI-compatible fixture returns
 * deterministic responses so request shaping, validation and error handling can
 * be checked without an API key.
 */
import assert from "node:assert/strict";
import http from "node:http";
import { AddressInfo } from "node:net";
import {
  getAiProviderConfig,
  parseComplaintClassification,
  requestComplaintClassification,
} from "../lib/ai/complaint-classification";
import type { AiProviderConfig } from "../lib/ai/complaint-classification";
import {
  getAiComplaintClassification,
  getFallbackComplaintClassification,
} from "../lib/complaints/classification";
import { canCorrectComplaintClassification } from "../lib/complaints/classification-access";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
} from "../lib/constants/complaint";
import {
  createComplaintSchema,
  updateClassificationSchema,
  updateComplaintSchema,
} from "../lib/validations/complaint";

type RecordedRequest = {
  path: string;
  authorization: string | undefined;
  body: Record<string, unknown>;
};

const EXPLANATION =
  "La description mentionne une fuite active qui peut endommager le logement.";
const ACTION = "Envoyer un plombier vérifier la fuite et couper l'alimentation.";

function classification(
  category: string,
  priority: string,
  explanation = EXPLANATION,
  recommendedAction = ACTION,
) {
  return JSON.stringify({ category, priority, explanation, recommendedAction });
}

function fakeResponse(
  title: string,
): { status: number; content: string; delayMs?: number } {
  if (title.includes("Fuite d'eau")) {
    return { status: 200, content: classification("plumbing", "high") };
  }
  if (title.includes("Chauffage")) {
    return { status: 200, content: classification("heating", "urgent") };
  }
  if (title.includes("Électricité")) {
    return {
      status: 200,
      content: classification(
        "electricity",
        "urgent",
        "La description signale des étincelles et des fils dénudés, ce qui présente un danger immédiat.",
        "Couper le circuit concerné et envoyer un électricien en urgence.",
      ),
    };
  }
  if (title.includes("Invalide catégorie")) {
    return { status: 200, content: classification("water_damage", "high") };
  }
  if (title.includes("Invalide priorité")) {
    return { status: 200, content: classification("plumbing", "critical") };
  }
  if (title.includes("Explication manquante")) {
    return {
      status: 200,
      content: JSON.stringify({ category: "plumbing", priority: "high" }),
    };
  }
  if (title.includes("Erreur fournisseur")) {
    return { status: 500, content: JSON.stringify({ error: "boom" }) };
  }
  if (title.includes("Réponse illisible")) {
    return { status: 200, content: "ceci n'est pas du JSON" };
  }
  if (title.includes("Réponse clôturée")) {
    return {
      status: 200,
      content: `\`\`\`json\n${classification("electricity", "medium")}\n\`\`\``,
    };
  }
  if (title.includes("Champs interdits")) {
    return {
      status: 200,
      content: JSON.stringify({
        category: "plumbing",
        priority: "high",
        explanation: EXPLANATION,
        recommendedAction: ACTION,
        status: "resolved",
        technicianId: "64b000000000000000000099",
      }),
    };
  }
  if (title.includes("Lenteur")) {
    return {
      status: 200,
      content: classification("other", "low"),
      delayMs: 300,
    };
  }
  return { status: 200, content: classification("other", "medium") };
}

async function startProvider() {
  const requests: RecordedRequest[] = [];

  const server = http.createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => {
      const body = JSON.parse(raw || "{}") as {
        messages?: Array<{ role?: string; content?: string }>;
      };
      requests.push({
        path: request.url ?? "",
        authorization: request.headers.authorization,
        body: body as Record<string, unknown>,
      });

      const userMessage =
        body.messages?.find((message) => message.role === "user")?.content ?? "";
      const title = userMessage.split("\n")[0]?.replace(/^Titre\s*:\s*/, "") ?? "";
      const fixture = fakeResponse(title);

      const send = () => {
        response.writeHead(fixture.status, {
          "Content-Type": "application/json",
        });
        response.end(
          JSON.stringify({
            choices: [{ message: { content: fixture.content } }],
          }),
        );
      };

      if (fixture.delayMs) {
        setTimeout(send, fixture.delayMs);
        return;
      }
      send();
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address() as AddressInfo;
  return {
    server,
    port,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function main() {
  // Configuration is opt-in: no key/model, no classification.
  assert.equal(getAiProviderConfig({}), null);
  assert.equal(getAiProviderConfig({ AI_API_KEY: "key-only" }), null);
  assert.equal(getAiProviderConfig({ AI_MODEL: "model-only" }), null);

  const configured = getAiProviderConfig({
    AI_API_KEY: " test-key ",
    AI_MODEL: " test-model ",
    AI_BASE_URL: "https://example.test/v1///",
  });
  assert.deepEqual(configured, {
    apiKey: "test-key",
    model: "test-model",
    baseUrl: "https://example.test/v1",
  });

  // Tenant submission schema accepts only form fields and strips forged
  // category/priority values instead of trusting them.
  const forgedCreate = createComplaintSchema.safeParse({
    title: "Fuite d'eau",
    description: "De l'eau fuit du plafond de la salle de bain.",
    category: "electricity",
    priority: "urgent",
    clientKey: "client-key-123",
  });
  assert.equal(forgedCreate.success, true);
  if (forgedCreate.success) {
    assert.deepEqual(Object.keys(forgedCreate.data).sort(), [
      "clientKey",
      "description",
      "title",
    ]);
    assert.equal("category" in forgedCreate.data, false);
    assert.equal("priority" in forgedCreate.data, false);
  }

  const forgedUpdate = updateComplaintSchema.safeParse({
    id: "64b000000000000000000001",
    title: "Fuite d'eau",
    description: "De l'eau fuit du plafond de la salle de bain.",
    category: "electricity",
    priority: "urgent",
  });
  assert.equal(forgedUpdate.success, true);
  if (forgedUpdate.success) {
    assert.equal("category" in forgedUpdate.data, false);
    assert.equal("priority" in forgedUpdate.data, false);
  }

  assert.equal(
    createComplaintSchema.safeParse({ title: "Fu", description: "court" })
      .success,
    false,
  );

  // Staff correction schema only accepts the existing enums.
  assert.equal(
    updateClassificationSchema.safeParse({
      id: "64b000000000000000000001",
      category: "plumbing",
      priority: "high",
    }).success,
    true,
  );
  assert.equal(
    updateClassificationSchema.safeParse({
      id: "64b000000000000000000001",
      category: "water_damage",
      priority: "high",
    }).success,
    false,
  );
  assert.equal(
    updateClassificationSchema.safeParse({
      id: "64b000000000000000000001",
      category: "plumbing",
      priority: "critical",
    }).success,
    false,
  );
  assert.equal(
    updateClassificationSchema.safeParse({
      id: "64b000000000000000000001",
      category: "plumbing",
    }).success,
    false,
  );

  // Only staff roles may correct a classification.
  assert.equal(canCorrectComplaintClassification("TENANT"), false);
  assert.equal(canCorrectComplaintClassification("OWNER"), true);
  assert.equal(canCorrectComplaintClassification("TECHNICIAN"), true);
  assert.equal(canCorrectComplaintClassification("ADMIN"), true);
  assert.equal(canCorrectComplaintClassification(undefined), false);

  // Invalid payloads never produce a usable classification.
  assert.equal(parseComplaintClassification('{"category":"plumbing"}'), null);
  assert.equal(
    parseComplaintClassification(
      '{"category":"plumbing","priority":"critical","explanation":"x","recommendedAction":"y"}',
    ),
    null,
  );
  assert.equal(
    parseComplaintClassification(
      '{"category":"plumbing","priority":"high","recommendedAction":"y"}',
    ),
    null,
  );
  assert.deepEqual(
    parseComplaintClassification(
      `\`\`\`json\n${classification("plumbing", "high")}\n\`\`\``,
    ),
    {
      category: "plumbing",
      priority: "high",
      explanation: EXPLANATION,
      recommendedAction: ACTION,
    },
  );

  // Safe fallback uses only existing enum values and is flagged for review.
  const fallback = getFallbackComplaintClassification(
    new Date("2026-01-01T00:00:00.000Z"),
  );
  assert.equal(fallback.category, "other");
  assert.equal(fallback.priority, "medium");
  assert.equal(fallback.classificationStatus, "needs_review");
  assert.equal(fallback.classificationSource, "fallback");
  assert.ok(COMPLAINT_CATEGORIES.includes(fallback.category));
  assert.ok(COMPLAINT_PRIORITIES.includes(fallback.priority));
  assert.equal(fallback.aiExplanation, undefined);
  assert.equal(fallback.recommendedAction, undefined);

  const aiFields = getAiComplaintClassification({
    category: "plumbing",
    priority: "high",
    explanation: EXPLANATION,
    recommendedAction: ACTION,
  });
  assert.equal(aiFields.classificationStatus, "completed");
  assert.equal(aiFields.classificationSource, "ai");
  assert.equal(aiFields.aiExplanation, EXPLANATION);
  assert.equal(aiFields.recommendedAction, ACTION);

  const provider = await startProvider();
  const config: AiProviderConfig = {
    apiKey: "test-key",
    model: "test-model",
    baseUrl: `http://127.0.0.1:${provider.port}/v1`,
  };

  try {
    // Not configured: no network call.
    const notConfigured = await requestComplaintClassification(
      {
        title: "Fuite d'eau",
        description: "De l'eau fuit du plafond de la salle de bain.",
      },
      { config: null },
    );
    assert.equal(notConfigured.ok, false);
    if (!notConfigured.ok) assert.equal(notConfigured.code, "not_configured");
    assert.equal(provider.requests.length, 0);

    // Water leak.
    const water = await requestComplaintClassification(
      {
        title: "Fuite d'eau",
        description: "De l'eau fuit du plafond de la salle de bain.",
      },
      { config },
    );
    assert.deepEqual(water, {
      ok: true,
      classification: {
        category: "plumbing",
        priority: "high",
        explanation: EXPLANATION,
        recommendedAction: ACTION,
      },
    });

    const request = provider.requests.at(-1);
    assert.ok(request);
    assert.equal(request.path, "/v1/chat/completions");
    assert.equal(request.authorization, "Bearer test-key");
    assert.equal(request.body.model, "test-model");
    assert.deepEqual(Object.keys(request.body).sort(), [
      "max_tokens",
      "messages",
      "model",
      "response_format",
      "temperature",
    ]);
    const serializedBody = JSON.stringify(request.body);
    assert.match(serializedBody, /Fuite d'eau/);
    assert.match(serializedBody, /salle de bain/);
    assert.match(serializedBody, /plumbing/);
    assert.match(serializedBody, /heating/);
    assert.match(serializedBody, /urgent/);
    assert.match(serializedBody, /explanation/);
    assert.match(serializedBody, /recommendedAction/);
    assert.doesNotMatch(serializedBody, /tenantId|propertyId|adresse|ownerId/i);

    // Heating.
    const heating = await requestComplaintClassification(
      {
        title: "Chauffage en panne",
        description: "Le radiateur du salon reste froid depuis deux jours.",
      },
      { config },
    );
    assert.equal(heating.ok, true);
    if (heating.ok) {
      assert.equal(heating.classification.category, "heating");
      assert.equal(heating.classification.priority, "urgent");
    }

    // Electrical safety.
    const electrical = await requestComplaintClassification(
      {
        title: "Électricité dangereuse",
        description:
          "Une prise fait des étincelles et des fils dénudés sont visibles près de l'évier.",
      },
      { config },
    );
    assert.equal(electrical.ok, true);
    if (electrical.ok) {
      assert.equal(electrical.classification.category, "electricity");
      assert.equal(electrical.classification.priority, "urgent");
    }

    // Invalid category.
    const invalidCategory = await requestComplaintClassification(
      {
        title: "Invalide catégorie",
        description: "Le fournisseur renvoie une catégorie inconnue.",
      },
      { config },
    );
    assert.equal(invalidCategory.ok, false);
    if (!invalidCategory.ok)
      assert.equal(invalidCategory.code, "invalid_response");

    // Invalid priority.
    const invalidPriority = await requestComplaintClassification(
      {
        title: "Invalide priorité",
        description: "Le fournisseur renvoie une priorité inconnue.",
      },
      { config },
    );
    assert.equal(invalidPriority.ok, false);
    if (!invalidPriority.ok)
      assert.equal(invalidPriority.code, "invalid_response");

    // Missing explanation is rejected: all four fields are required.
    const missingExplanation = await requestComplaintClassification(
      {
        title: "Explication manquante",
        description: "Le fournisseur omet l'explication de la priorité.",
      },
      { config },
    );
    assert.equal(missingExplanation.ok, false);
    if (!missingExplanation.ok)
      assert.equal(missingExplanation.code, "invalid_response");

    // Provider error.
    const providerError = await requestComplaintClassification(
      {
        title: "Erreur fournisseur",
        description: "Le fournisseur répond avec une erreur serveur.",
      },
      { config },
    );
    assert.equal(providerError.ok, false);
    if (!providerError.ok) assert.equal(providerError.code, "provider_error");

    // Malformed content.
    const malformed = await requestComplaintClassification(
      {
        title: "Réponse illisible",
        description: "Le fournisseur renvoie du texte non JSON.",
      },
      { config },
    );
    assert.equal(malformed.ok, false);
    if (!malformed.ok) assert.equal(malformed.code, "invalid_response");

    // Timeout.
    const timeout = await requestComplaintClassification(
      {
        title: "Lenteur",
        description: "Le fournisseur dépasse le délai autorisé.",
      },
      { config, timeoutMs: 50 },
    );
    assert.equal(timeout.ok, false);
    if (!timeout.ok) assert.equal(timeout.code, "timeout");

    // Extra provider fields are ignored: no status or technician can leak in.
    const forbidden = await requestComplaintClassification(
      {
        title: "Champs interdits",
        description: "Le fournisseur tente d'ajouter un statut et un technicien.",
      },
      { config },
    );
    assert.equal(forbidden.ok, true);
    if (forbidden.ok) {
      assert.deepEqual(Object.keys(forbidden.classification).sort(), [
        "category",
        "explanation",
        "priority",
        "recommendedAction",
      ]);
    }

    // Fenced JSON from chat models is accepted.
    const fenced = await requestComplaintClassification(
      {
        title: "Réponse clôturée",
        description: "Le fournisseur renvoie du JSON dans un bloc Markdown.",
      },
      { config },
    );
    assert.equal(fenced.ok, true);
    if (fenced.ok) {
      assert.equal(fenced.classification.category, "electricity");
      assert.equal(fenced.classification.priority, "medium");
    }

    console.log("✔ Provider is opt-in; missing configuration is reported");
    console.log("✔ Forged category/priority are stripped from tenant schemas");
    console.log("✔ Staff correction accepts only existing enum values");
    console.log("✔ Tenant cannot correct a classification; staff roles can");
    console.log("✔ Water leak -> plumbing / high");
    console.log("✔ Heating -> heating / urgent");
    console.log("✔ Electrical safety -> electricity / urgent");
    console.log("✔ Invalid category, priority and missing explanation are rejected");
    console.log("✔ Provider errors and malformed responses are handled");
    console.log("✔ Timeout returns a clear failure");
    console.log("✔ Failure uses a safe fallback marked needs_review");
    console.log("✔ Status/technician fields cannot reach the classification");
    console.log("✔ Only title, description and allowed options are sent");
  } finally {
    await provider.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
