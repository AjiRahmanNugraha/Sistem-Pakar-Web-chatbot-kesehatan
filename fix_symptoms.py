import pymongo
import re

def main():
    # Connect to MongoDB (adjust the URI as needed)
    client = pymongo.MongoClient("mongodb://localhost:27017/")
    db = client['dokter']  # Replace with your database name

    knowledge_base = db['knowledgebases']  # Collection for KnowledgeBase
    symptoms_collection = db['symptoms']  # Collection for Symptom

    # Fetch all knowledge base documents
    kb_docs = list(knowledge_base.find({}))

    all_symptoms = set()

    # Process each knowledge base document
    for doc in kb_docs:
        symptoms = doc.get('symptoms', [])
        # Remove underscores and double spaces from symptoms
        new_symptoms = []
        for symptom in symptoms:
            cleaned = symptom.replace('_', ' ')
            cleaned = re.sub(r'\s+', ' ', cleaned).strip()
            new_symptoms.append(cleaned)
            all_symptoms.add(cleaned)

        # Update the document with cleaned symptoms (no underscores, no double spaces)
        knowledge_base.update_one(
            {'_id': doc['_id']},
            {'$set': {'symptoms': new_symptoms}}
        )

    # Insert unique symptoms into symptoms collection
    for symptom in all_symptoms:
        # Check if symptom already exists
        if symptoms_collection.count_documents({'name': symptom}, limit=1) == 0:
            symptoms_collection.insert_one({'name': symptom})

    print(f"Updated {len(kb_docs)} knowledge base documents and added {len(all_symptoms)} unique symptoms.")

if __name__ == "__main__":
    main()
